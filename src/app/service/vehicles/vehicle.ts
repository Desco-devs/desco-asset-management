export async function getVehiclesByProject(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}/vehicles`, {
        method: "GET",
        cache: "no-store",
    })

    if (!res.ok) throw new Error("Failed to fetch vehicles")

    return await res.json()
}

export async function createVehicle(
    projectId: string,
    vehicleData: {
        brand: string
        model: string
        type: string
        plateNumber: string
        inspectionDate: string
        before: number
        expiryDate: string
        status: string
        remarks?: string
        owner: string
        frontImgUrl?: string
        backImgUrl?: string
        side1ImgUrl?: string
        side2ImgUrl?: string
    }
) {
    const res = await fetch(`/api/projects/${projectId}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error?.error || "Failed to create vehicle")
    }

    return await res.json()
}
