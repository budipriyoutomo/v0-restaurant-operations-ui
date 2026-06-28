// All mock data has been removed. Data comes from the backend API via the Zustand store.
// These empty exports are kept so existing import statements continue to compile.

export const outlets:    { id: string; name: string; code: string; status: string }[]  = []
export const pics:       { id: string; name: string; email: string; phone: string; department: string; categories: string[] }[] = []
export const notifications: { id: string; title: string; message: string; time: string; type: string; read: boolean }[] = []

export const tickets:        Record<string, unknown>[] = []
export const equipmentTypes: Record<string, { name: string; category: string; brand: string; model: string; serialNumber: string; installDate: string; recurring?: boolean }> = {}
export const operationalTickets: Record<string, unknown>[] = []

export const expenseRequests: Record<string, unknown>[] = []
export const financeSummary = { totalBudget: 0, spent: 0, pending: 0, remaining: 0 }

export const complaints:           Record<string, unknown>[] = []
export const complaintTrendData:   Record<string, unknown>[] = []
export const sentimentData:        Record<string, unknown>[] = []
export const complaintCategoryData:Record<string, unknown>[] = []

export const capaItems:   Record<string, unknown>[] = []
export const qaScoreData: Record<string, unknown>[] = []

export const assets:      Record<string, unknown>[] = []
export const workOrders:  Record<string, unknown>[] = []
export const technicians: Record<string, unknown>[] = []

export const ticketTrendData:    Record<string, unknown>[] = []
export const issueCategoryData:  Record<string, unknown>[] = []
export const maintenanceCostData:Record<string, unknown>[] = []
export const outletRankings:     Record<string, unknown>[] = []
export const realtimeAlerts:     Record<string, unknown>[] = []
export const engineeringKPIs = { mttr: 0, uptime: 0, backlog: 0, pmCompliance: 0 }
export const mttrTrendData: Record<string, unknown>[] = []
