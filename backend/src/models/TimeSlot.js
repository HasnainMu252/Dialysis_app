import mongoose from 'mongoose';
const timeSlotSchema = new mongoose.Schema({
  name:{type:String, required:true}, startTime:{type:String, required:true}, endTime:{type:String, required:true},
  bufferMinutes:{type:Number, default:30}, maxChairs:{type:Number, default:1}, isActive:{type:Boolean, default:true}
}, {timestamps:true});
export default mongoose.model('TimeSlot', timeSlotSchema);
