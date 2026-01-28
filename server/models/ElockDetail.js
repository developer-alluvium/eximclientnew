import mongoose from "mongoose";

const elockDetailSchema = new mongoose.Schema(
    {
        elock_number: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["ASSIGNED", "UNASSIGNED", "RETURNED"],
            default: "UNASSIGNED",
        },
        consignor: {
            type: String,
            trim: true,
            default: "",
        },
        consignee: {
            type: String,
            trim: true,
            default: "",
        },
        vehicle_number: {
            type: String,
            trim: true,
            default: "",
        },
        driver_name: {
            type: String,
            trim: true,
            default: "",
        },
        driver_phone: {
            type: String,
            trim: true,
            default: "",
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EximclientUser",
            required: true,
        },
        ie_code: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for better query performance
elockDetailSchema.index({ elock_number: 1 });
elockDetailSchema.index({ status: 1 });
elockDetailSchema.index({ ie_code: 1 });
elockDetailSchema.index({ created_by: 1 });
elockDetailSchema.index({ createdAt: -1 });

const ElockDetail = mongoose.model("ElockDetail", elockDetailSchema);

export default ElockDetail;
