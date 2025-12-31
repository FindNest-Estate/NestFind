import PropertyEditor from '@/components/PropertyEditor';

/**
 * Property Editor Page - /sell/create/[id]
 * 
 * Loads existing DRAFT property and renders editor.
 * All changes auto-save to backend immediately.
 */

interface PropertyEditorPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PropertyEditorPage({ params }: PropertyEditorPageProps) {
    const { id } = await params;
    return <PropertyEditor propertyId={id} />;
}
