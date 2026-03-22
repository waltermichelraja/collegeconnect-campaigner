import Sidebar from "./components/Sidebar"
import CampaignDashboard from "./pages/CampaignDashboard"
import CreateCampaign from "./pages/CreateCampaign"
import CampaignAnalytics from "./pages/CampaignAnalytics"
import {useState} from "react"

export default function App(){
    const [page,setPage]=useState("dashboard")
    const [campaign,setCampaign]=useState(null)

    return (
        <div style={styles.container}>
            <Sidebar/>

            <div style={styles.content}>

                {page==="dashboard"&&(
                    <CampaignDashboard
                        onCreate={()=>setPage("create")}
                        onSelect={(c)=>{
                            setCampaign(c)
                            setPage("analytics")
                        }}
                    />
                )}

                {page==="create"&&(
                    <CreateCampaign
                        onBack={()=>setPage("dashboard")}
                        onCreated={(c)=>{
                            setCampaign(c)
                            setPage("analytics")
                        }}
                    />
                )}

                {page==="analytics"&&campaign&&(
                    <CampaignAnalytics
                        campaign={campaign}
                        onBack={()=>setPage("dashboard")}
                    />
                )}

            </div>
        </div>
    )
}

const styles={
    container:{display:"flex",minHeight:"100vh"},
    content:{flex:1,padding:"40px"}
}