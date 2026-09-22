export const getContainerKey = (c, idx = 0) =>
  c._id || (c.container_number || c.container_no || `idx-${idx}`);

export const getContainerNo = (c) =>
  (c.container_number || c.container_no || "").trim();

export const getEwbDocNumber = (ewb) =>
  (
    ewb?.requestPayload?.document_number ||
    ewb?.requestPayload?.formData?.documentNumber ||
    ewb?.documentNumber ||
    ewb?.document_number ||
    ""
  ).trim();

export const getContainersCoveredByEwb = (ewb) => {
  const ids = new Set();
  const payload = ewb?.requestPayload || {};
  const formData = payload.formData || payload;

  [formData.containerIds, payload.containerIds, ewb?.containerIds].forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.forEach((id) => {
        if (id != null && String(id).trim()) ids.add(String(id).trim());
      });
    }
  });

  if (ewb?.containerId != null && String(ewb.containerId).trim()) {
    ids.add(String(ewb.containerId).trim());
  }

  return [...ids];
};

export const containerMatchesCoverageId = (cont, coverageId) => {
  const id = String(coverageId || "").trim();
  if (!id || !cont) return false;

  const idUpper = id.toUpperCase();
  const cNo = getContainerNo(cont).toUpperCase();
  const cKey = String(getContainerKey(cont)).toUpperCase();

  if (cont._id && String(cont._id) === id) return true;
  if (cKey === idUpper) return true;
  if (cNo && cNo === idUpper) return true;
  if (cNo && idUpper.length >= 4 && cNo.endsWith(idUpper.slice(-4))) return true;
  if (cNo && idUpper.length >= 4 && cNo.includes(idUpper)) return true;

  return false;
};

export const isCombinedEwb = (ewb, beNo) => {
  const doc = getEwbDocNumber(ewb);
  const be = String(beNo || "").trim();
  return be && doc === be && !doc.includes("-CH-");
};

export const hasAnyCombinedEwb = (existingEwbs, beNo) =>
  (existingEwbs || []).some((ewb) => isCombinedEwb(ewb, beNo));

export const extractEwbNumberClient = (obj) => {
  if (!obj) return null;
  const candidateKeys = [
    "ewbNo", "ewayBillNo", "ewbNumber", "ewayBillNumber", "generatedEwbNo", "eway_bill_no", "ewb_no"
  ];
  const queue = [obj];
  const visited = new Set();
  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr || typeof curr !== "object" || visited.has(curr)) continue;
    visited.add(curr);
    for (const key of candidateKeys) {
      const val = curr[key];
      if (val !== undefined && val !== null) {
        const cleaned = String(val).trim();
        if (/^\d{12}$/.test(cleaned)) return cleaned;
      }
    }
    const subKeys = ["data", "responseData", "response_data", "result", "results", "itemList", "response"];
    for (const sk of subKeys) {
      if (curr[sk] && typeof curr[sk] === "object") queue.push(curr[sk]);
    }
    if (Array.isArray(curr)) {
      for (const item of curr) {
        if (item && typeof item === "object") queue.push(item);
      }
    }
  }
  const stringCandidates = [
    obj?.message, obj?.error, obj?.alert, obj?.status_desc, obj?.data?.message, obj?.data?.error
  ];
  for (const candidate of stringCandidates) {
    if (!candidate) continue;
    const text = typeof candidate === "string" ? candidate : JSON.stringify(candidate);
    const match = text.match(/\b\d{12}\b/);
    if (match) return match[0];
  }
  return null;
};

export const getExistingEwbForContainer = (cont, existingEwbs, beNo) => {
  const cNo = getContainerNo(cont).toUpperCase();
  if (!cNo) return null;

  const suffix = cNo.slice(-4);

  for (const ewb of existingEwbs || []) {
    // 1. Direct container match on EWB record if present
    const ewbCont = (
      ewb?.containerNumber ||
      ewb?.container_number ||
      ewb?.containerNo ||
      ewb?.container_no ||
      ewb?.container ||
      ""
    ).toString().trim().toUpperCase();
    if (ewbCont && (ewbCont === cNo || (cNo.length >= 4 && ewbCont.endsWith(suffix)))) {
      return ewb;
    }

    // 2. If EWB record has nested containers array
    if (Array.isArray(ewb?.containers)) {
      const foundInNested = ewb.containers.find(nc => {
        const ncNo = (nc?.containerNumber || nc?.container_number || nc?.containerNo || nc?.container_no || "").toString().trim().toUpperCase();
        return ncNo === cNo || (cNo.length >= 4 && ncNo.endsWith(suffix));
      });
      if (foundInNested && (foundInNested.ewayBillNo || foundInNested.ewaybill_no || foundInNested.ewbNo)) {
        return {
          ...ewb,
          ewbNo: foundInNested.ewayBillNo || foundInNested.ewaybill_no || foundInNested.ewbNo,
          ewayBillNo: foundInNested.ewayBillNo || foundInNested.ewaybill_no || foundInNested.ewbNo,
        };
      }
    }

    // 3. Document Number suffix match (-CH-XXXX)
    const docUpper = getEwbDocNumber(ewb).toUpperCase();
    if (docUpper.includes(`-CH-${suffix}`)) {
      return ewb;
    }

    // 4. Combined EWB match
    if (isCombinedEwb(ewb, beNo)) {
      const coveredIds = getContainersCoveredByEwb(ewb);
      if (coveredIds.length === 0) continue;
      if (coveredIds.some((id) => containerMatchesCoverageId(cont, id))) {
        return ewb;
      }
    }
  }

  return null;
};

export const getPendingContainers = (allContainers, existingEwbs, beNo) =>
  (allContainers || []).filter(
    (c) => !getExistingEwbForContainer(c, existingEwbs, beNo)
  );

export const allContainersHaveEwb = (allContainers, existingEwbs, beNo) => {
  if (!allContainers?.length) return (existingEwbs || []).length > 0;
  return getPendingContainers(allContainers, existingEwbs, beNo).length === 0;
};
