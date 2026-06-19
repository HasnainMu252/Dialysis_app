import mongoose from 'mongoose';
const machineSchema = new mongoose.Schema({
  machineCode:{type:String, required:true, unique:true}, chair:{type:mongoose.Schema.Types.ObjectId, ref:'Chair'},
  status:{type:String, enum:['available','in_use','maintenance','out_of_order'], default:'available'},
  lastMaintenanceAt:Date, nextMaintenanceDue:Date, notes:String
}, {timestamps:true});
export default mongoose.model('Machine', machineSchema);
