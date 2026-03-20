import {create} from "zustand"

const useCampaignStore=create((set)=>({
    campaignId:null,
    setCampaignId:(id)=>set({campaignId:id})
}))

export default useCampaignStore