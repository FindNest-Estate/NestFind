"use client";

import AgentSettings from "@/components/dashboard/AgentSettings";
import AgentLayout from "@/components/dashboard/AgentLayout";

export default function SettingsPage() {
    return (
        <AgentLayout title="Settings">
            <AgentSettings />
        </AgentLayout>
    );
}
