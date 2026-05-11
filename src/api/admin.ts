export async function setQualified(
    token: string,
    performanceId: string,
    qualified: boolean
) {
    const API_URL = import.meta.env.VITE_API_URL;

    const res = await fetch(
        `${API_URL}/admin/performance/${performanceId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                qualified,
            }),
        }
    );

    if (!res.ok) {
        throw new Error("Failed to update qualified");
    }

    return;
}