export const getTableRowsClassname = (params) => {
  const status = params.original.detailed_status;

  if (status === "Billing Pending") {
    return "billing-pending";
  } else if (status === "Custom Clearance Completed") {
    return "custom-clearance-completed";
  } else if (status === "PCV Done, Duty Payment Pending") {
    return "duty-payment-pending";
  } else if (status === "BE Noted, Clearance Pending") {
    return "clearance-pending";
  } else if (status === "BE Noted, Arrival Pending") {
    return "arrival-pending";
  } else if (status === "Gateway IGM Filed") {
    return "sea-igm-filed";
  } else if (status === "Discharged") {
    return "discharge";
  } else if (status === "Estimated Time of Arrival") {
    return "eta";
  } else if (status === "Do completed and Delivery pending") {
    return "do-completed-delivery-pending";
  }

  return ""; // Default class name
};
