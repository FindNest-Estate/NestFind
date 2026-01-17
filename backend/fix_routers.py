import re

# Fix visits.py
with open('app/routers/visits.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = re.sub(r'current_user: dict = Depends\(get_current_user\)', 'current_user: AuthenticatedUser = Depends(get_current_user)', content)
content = re.sub(r'current_user\["user_id"\]', 'current_user.user_id', content)
content = re.sub(r'current_user\.get\("role"\) == "AGENT"', '"AGENT" in (current_user.roles or [])', content)
content = re.sub(r'current_user\.get\("role"\) != "AGENT"', '"AGENT" not in (current_user.roles or [])', content)
with open('app/routers/visits.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix offers.py
with open('app/routers/offers.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('from ..middleware.auth_middleware import get_current_user', 
                         'from ..middleware.auth_middleware import get_current_user, AuthenticatedUser')
content = re.sub(r'current_user: dict = Depends\(get_current_user\)', 'current_user: AuthenticatedUser = Depends(get_current_user)', content)
content = re.sub(r'current_user\["user_id"\]', 'current_user.user_id', content)
with open('app/routers/offers.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix reservations.py
with open('app/routers/reservations.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('from ..middleware.auth_middleware import get_current_user', 
                         'from ..middleware.auth_middleware import get_current_user, AuthenticatedUser')
content = re.sub(r'current_user: dict = Depends\(get_current_user\)', 'current_user: AuthenticatedUser = Depends(get_current_user)', content)
content = re.sub(r'current_user\["user_id"\]', 'current_user.user_id', content)
with open('app/routers/reservations.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix transactions.py
with open('app/routers/transactions.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('from ..middleware.auth_middleware import get_current_user', 
                         'from ..middleware.auth_middleware import get_current_user, AuthenticatedUser')
content = re.sub(r'current_user: dict = Depends\(get_current_user\)', 'current_user: AuthenticatedUser = Depends(get_current_user)', content)
content = re.sub(r'current_user\["user_id"\]', 'current_user.user_id', content)
content = re.sub(r'current_user\.get\("role"\) != "AGENT"', '"AGENT" not in (current_user.roles or [])', content)
with open('app/routers/transactions.py', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix disputes.py
with open('app/routers/disputes.py', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('from ..middleware.auth_middleware import get_current_user', 
                         'from ..middleware.auth_middleware import get_current_user, AuthenticatedUser')
content = re.sub(r'current_user: dict = Depends\(get_current_user\)', 'current_user: AuthenticatedUser = Depends(get_current_user)', content)
content = re.sub(r'current_user\["user_id"\]', 'current_user.user_id', content)
content = re.sub(r'current_user\.get\("role"\) == "ADMIN" or current_user\.get\("role"\) == "CEO"', 
                '"ADMIN" in (current_user.roles or []) or "CEO" in (current_user.roles or [])', content)
content = re.sub(r'current_user\.get\("role"\) not in \["ADMIN", "CEO"\]', 
                'not any(role in (current_user.roles or []) for role in ["ADMIN", "CEO"])', content)
with open('app/routers/disputes.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ All routers updated successfully!")
