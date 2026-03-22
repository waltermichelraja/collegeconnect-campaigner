export default function Sidebar(){
    return (
        <div style={styles.sidebar}>
            <h2>Campaigner</h2>

            <p style={{opacity:0.5,marginTop:"20px"}}>
                WhatsApp Campaign Tool
            </p>
        </div>
    )
}

const styles={
    sidebar:{
        width:"240px",
        background:"#020617",
        padding:"30px",
        borderRight:"1px solid #1e293b",
        display:"flex",
        flexDirection:"column",
        minHeight:"100vh"
    }
}