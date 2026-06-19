import mongoose from 'mongoose';
import { QUEUE_STATUS } from '../utils/constants.js';
const queueSchema = new mongoose.Schema({
  session:{ type:mongoose.Schema.Types.ObjectId, ref:'DialysisSession', required:true, unique:true },
  patient:{ type:mongoose.Schema.Types.ObjectId, ref:'Patient', required:true },
  scheduledDate:{ type:Date, required:true, index:true },
  position:{ type:Number, required:true },
  status:{ type:String, enum:QUEUE_STATUS, default:'waiting' }
}, { timestamps:true });
export default mongoose.model('QueueEntry', queueSchema);
