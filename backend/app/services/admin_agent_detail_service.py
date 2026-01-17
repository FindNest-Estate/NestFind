from typing import Optional, List, Dict, Any
from uuid import UUID
import asyncpg
import json

class AdminAgentDetailService:
    """
    Service for fetching detailed agent information for admin review.
    Includes profile data and audit history (previous rejections).
    """

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def get_agent_details(self, agent_id: UUID) -> Dict[str, Any]:
        """
        Get full details of an agent including profile and rejection history.
        """
        async with self.db.acquire() as conn:
            # 1. Fetch User & Profile Data
            user_data = await conn.fetchrow(
                """
                SELECT 
                    u.id, u.full_name, u.email, u.mobile_number, u.status, u.created_at,
                    u.address, u.latitude, u.longitude,
                    ap.pan_number, ap.aadhaar_number, ap.service_radius_km
                FROM users u
                LEFT JOIN agent_profiles ap ON u.id = ap.user_id
                WHERE u.id = $1
                """,
                agent_id
            )

            if not user_data:
                return {"success": False, "error": "Agent not found"}

            # 2. Fetch Rejection History from Audit Logs
            # We look for 'AGENT_DECLINED' actions targeting this user
            history_rows = await conn.fetch(
                """
                SELECT 
                    action, timestamp, details,
                    (SELECT full_name FROM users WHERE id = audit_logs.user_id) as admin_name
                FROM audit_logs
                WHERE entity_id = $1 
                  AND entity_type = 'users'
                  AND action IN ('AGENT_DECLINED', 'AGENT_APPROVED', 'AGENT_SUSPENDED')
                ORDER BY timestamp DESC
                """,
                agent_id
            )

            history = []
            for row in history_rows:
                details = json.loads(row['details']) if isinstance(row['details'], str) else row['details']
                history.append({
                    "action": row['action'],
                    "timestamp": row['timestamp'].isoformat(),
                    "admin_name": row['admin_name'] or "System",
                    "reason": details.get('decision_reason') or details.get('reason')
                })

            return {
                "success": True,
                "agent": {
                    "id": str(user_data['id']),
                    "full_name": user_data['full_name'],
                    "email": user_data['email'],
                    "phone_number": user_data['mobile_number'],
                    "status": user_data['status'],
                    "submitted_at": user_data['created_at'].isoformat(),
                    "address": user_data['address'],
                    "coordinates": {
                        "lat": user_data['latitude'],
                        "lng": user_data['longitude']
                    } if user_data['latitude'] else None,
                    "profile": {
                        "pan_number": user_data['pan_number'],
                        "aadhaar_number": user_data['aadhaar_number'],
                        "service_radius": user_data['service_radius_km']
                    }
                },
                "history": history
            }

    async def get_coverage_areas(self, lat: float, lng: float, radius_km: int) -> Dict[str, Any]:
        """
        Fetch covered villages/towns/cities using Overpass API (proxied).
        """
        import requests
        import asyncio
        import json
        
        radius_meters = radius_km * 1000
        query = f"""
            [out:json][timeout:25];
            (
              node["place"~"city|town|village"](around:{radius_meters},{lat},{lng});
            );
            out body;
            >;
            out skel qt;
        """
        
        url = "https://overpass-api.de/api/interpreter"
        
        # Function to run in thread
        def fetch():
            response = requests.post(url, data=query, timeout=30)
            response.raise_for_status()
            return response.json()

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, fetch)
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_coverage_areas(self, lat: float, lng: float, radius_km: int) -> Dict[str, Any]:
        """
        Fetch covered villages/towns/cities using Overpass API (proxied).
        """
        import urllib.request
        import urllib.error
        import asyncio
        import json
        
        radius_meters = radius_km * 1000
        query = f"""
            [out:json][timeout:25];
            (
              node["place"~"city|town|village"](around:{radius_meters},{lat},{lng});
            );
            out body;
            >;
            out skel qt;
        """
        
        url = "https://overpass-api.de/api/interpreter"
        data = query.encode('utf-8')
        
        def fetch():
            req = urllib.request.Request(url, data=data, method='POST')
            with urllib.request.urlopen(req) as response:
                return json.load(response)

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(None, fetch)
            return {"success": True, "data": result}
        except Exception as e:
            # Fallback to alternative mirror if primary fails?
            # For now just return error
            return {"success": False, "error": str(e)}
