import React from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

interface StatusTimelineProps {
    status: string;
    history: {
        status: string;
        timestamp: string;
        actor?: string;
        notes?: string;
    }[];
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ status, history }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="text-green-500" />;
            case 'REJECTED': return <XCircle className="text-red-500" />;
            case 'CANCELLED': return <XCircle className="text-red-500" />;
            case 'COMPLETED': return <CheckCircle className="text-blue-500" />;
            case 'COUNTER_PROPOSED': return <AlertCircle className="text-orange-500" />;
            case 'PENDING': return <Clock className="text-yellow-500" />;
            default: return <Clock className="text-gray-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visit Timeline</h3>
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                {history.map((item, index) => (
                    <div key={index} className="mb-8 ml-6 relative">
                        <span className="absolute -left-9 bg-white rounded-full p-1">
                            {getStatusIcon(item.status)}
                        </span>
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-bold text-gray-900">{getStatusLabel(item.status)}</h4>
                                <span className="text-xs text-gray-500">
                                    {new Date(item.timestamp).toLocaleString()}
                                </span>
                            </div>
                            {item.actor && (
                                <p className="text-xs text-gray-600 mb-1">by {item.actor}</p>
                            )}
                            {item.notes && (
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                                    "{item.notes}"
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
