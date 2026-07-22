import axios from 'axios';

const normalizeOrg = (name) =>
  String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const orgNames = ['AMMANN INDIA PVT. LTD.', 'SWATI FIRE PROTECTION PVT. LTD.'];

const enquiryMatchesOrgs = (enquiry, orgNames) => {
  if (!orgNames.length) return false;
  const normalizedOrgs = orgNames.map(normalizeOrg).filter(Boolean);
  const candidates = [
    enquiry.organization_name,
    enquiry.shipper_name,
    enquiry.consignee_name,
    enquiry.bl_details?.consignee,
    enquiry.bl_details?.consignor,
  ]
    .filter(Boolean)
    .map(normalizeOrg);

  return candidates.some((c) =>
    normalizedOrgs.some((org) => c.includes(org) || org.includes(c))
  );
};

axios.get('https://eximbot.alvision.in/export/api/freight-enquiries')
  .then(res => {
    const all = res.data.data || [];
    const matched = all.filter(e => enquiryMatchesOrgs(e, orgNames));
    console.log('Total remote jobs:', all.length);
    console.log('Matched remote jobs for Sojith:', matched.length);
    if (matched.length > 0) {
      console.log('First matched job computedTab:', matched[0].computedTab);
    }
  })
  .catch(console.error);
