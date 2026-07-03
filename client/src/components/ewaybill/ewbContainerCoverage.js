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

export const getExistingEwbForContainer = (cont, existingEwbs, beNo) => {
  const cNo = getContainerNo(cont).toUpperCase();
  if (!cNo) return null;

  const suffix = cNo.slice(-4);

  for (const ewb of existingEwbs || []) {
    const docUpper = getEwbDocNumber(ewb).toUpperCase();

    if (docUpper.includes(`-CH-${suffix}`)) {
      return ewb;
    }

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
