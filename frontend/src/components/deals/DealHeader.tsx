import { DealDetail, DEAL_STATUS_LABELS } from "@/lib/types/deal";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { MapPin, IndianRupee } from "lucide-react";

interface DealHeaderProps {
    deal: DealDetail;
}

export function DealHeader({ deal }: DealHeaderProps) {
    return (
        <Card className="mb-6 border-l-4 border-l-blue-600 shadow-sm">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    {/* Left: Property & Status */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant={deal.is_active ? "default" : "secondary"}>
                                {DEAL_STATUS_LABELS[deal.status]}
                            </Badge>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                ID: {deal.id.slice(0, 8)}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {deal.property.title}
                        </h1>
                        <div className="flex items-center text-sm text-gray-500 gap-4">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {deal.property.address}, {deal.property.city}
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                <IndianRupee className="w-4 h-4" />
                                Agreed: ₹{(deal.agreed_price || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {/* Right: Participants */}
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Buyer</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {deal.parties.buyer.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">{deal.parties.buyer.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Seller</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                                    {deal.parties.seller.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">{deal.parties.seller.name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase">Agent</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                                    {deal.parties.agent.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium">{deal.parties.agent.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
