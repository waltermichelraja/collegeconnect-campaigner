import { useState } from "react"
import Sidebar from "./components/Sidebar"
import CampaignDashboard from "./pages/CampaignDashboard"
import CreateCampaign from "./pages/CreateCampaign"
import CampaignAnalytics from "./pages/CampaignAnalytics"
import { useToast, ToastContainer } from "./components/Toast"

export default function App() {
    const [page, setPage] = useState("dashboard")
    const [campaign, setCampaign] = useState(null)
    const { toasts, addToast } = useToast()

    return (
        <div style={styles.container}>
            <Sidebar page={page} />

            <main style={styles.main}>
                {page === "dashboard" && (
                    <CampaignDashboard
                        onCreate={() => setPage("create")}
                        onSelect={(c) => {
                            setCampaign(c)
                            setPage("analytics")
                        }}
                        toast={addToast}
                    />
                )}

                {page === "create" && (
                    <CreateCampaign
                        onBack={() => setPage("dashboard")}
                        onCreated={(c) => {
                            setCampaign(c)
                            setPage("analytics")
                            addToast("Campaign created and sending started!", "success")
                        }}
                        toast={addToast}
                    />
                )}

                {page === "analytics" && campaign && (
                    <CampaignAnalytics
                        campaign={campaign}
                        onBack={() => setPage("dashboard")}
                        toast={addToast}
                    />
                )}
            </main>

            <ToastContainer toasts={toasts} />
        </div>
    )
}

const styles = {
    container: {
        display: "flex",
        minHeight: "100vh",
    },
    main: {
        flex: 1,
        padding: "36px 40px",
        overflowY: "auto",
        maxWidth: "calc(100vw - 220px)",
    }
}