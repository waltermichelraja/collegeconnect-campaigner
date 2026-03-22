const{app,BrowserWindow,Menu}=require("electron")
const path=require("path")

let win

function createWindow(){
    win=new BrowserWindow({
        width:1200,
        height:800,
        backgroundColor:"#020617",
        autoHideMenuBar:true,
        title:"WACampaigner",
        webPreferences:{
            contextIsolation:true,
            nodeIntegration:false,
            preload:path.join(__dirname,"preload.js")
        }
    })

    win.loadFile(path.join(__dirname,"../dist/index.html"))
}

app.whenReady().then(()=>{
    Menu.setApplicationMenu(null)
    createWindow()

    app.on("activate",()=>{
        if(BrowserWindow.getAllWindows().length===0){
            createWindow()
        }
    })
})

app.on("window-all-closed",()=>{
    if(process.platform!=="darwin"){
        app.quit()
    }
})