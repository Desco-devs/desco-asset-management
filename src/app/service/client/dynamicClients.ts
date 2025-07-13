// Get clients by locationId
export async function getClientsByLocation(locationId: string) {
    const res = await fetch(`/api/locations/${locationId}`, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch clients for location ${locationId}`)
    }

    return await res.json()
}

// Get projects by clientId
export async function getProjectsByClient(clientId: string) {
    const res = await fetch(`/api/clients/${clientId}`, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch projects for client ${clientId}`)
    }

    return await res.json()
}

// Get equipments by projectId
export async function getEquipmentsByProject(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
    })

    if (!res.ok) {
        throw new Error(`Failed to fetch equipments for project ${projectId}`)
    }

    const project = await res.json()
    return project.equipments ?? []
}
