/**
 * Auth Loading Spinner
 * 
 * Displays during AUTH_CHECKING transient state.
 * Used while verifying user status with backend.
 */

export default function AuthLoadingSpinner() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Verifying authentication...</p>
            </div>
        </div>
    );
}
