export async function ratePerformance(
    token: string,
    performanceId: string,
    score: number,
    comment: string,
) {
    const API_URL = import.meta.env.VITE_API_URL;
    const res = await fetch(
        `${API_URL}/v1/performance/${performanceId}/rate`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                Authorization:
                    `Bearer ${token}`,
            },

            body: JSON.stringify({
                score,
                comment,
            }),
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(
            err.message || "rate failed"
        );
    }

    return;
}