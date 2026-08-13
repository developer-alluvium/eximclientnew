import mongoose from "mongoose";
import dotenv from "dotenv";
import EximclientUser from "./models/eximclientUserModel.js";
import JobModel from "./models/jobModel.js";
import ElockDetail from "./models/ElockDetail.js";
import OpenPointModel from "./models/openPoints/openPointModel.js";
import OpenPointProjectModel from "./models/openPoints/openPointProjectModel.js";

dotenv.config();

const run = async () => {
  const mongoURI = process.env.PROD_MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim";
  console.log("Connecting to production MongoDB database...");

  try {
    await mongoose.connect(mongoURI);
    console.log("Connected successfully to production database.");

    const email = "demo@novusha.com";
    const passwordPlain = "Novusha@2026";
    const name = "Novusha Client Demo";
    const fakeIeCode = "DEMO100001";
    const fakeCompanyName = "NOVUSHA DEMO GLOBAL IMPEX PRIVATE LIMITED";

    const dummySuperAdminId = new mongoose.Types.ObjectId("68512c69881317b9c8da1165");

    const ieCodeAssignment = {
      ie_code_no: fakeIeCode,
      importer_name: fakeCompanyName,
      exporter_filter: fakeCompanyName,
      assigned_at: new Date(),
      assigned_by: dummySuperAdminId,
      assigned_by_model: "SuperAdmin"
    };

    const modules = [
      "/importdsr",
      "/export",
      "/netpage",
      "/elock",
      "/trademasterguide",
      "/transport",
      "/ewaybill",
      "/open-points",
      "/freight-forwarding",
      "/dgft",
      "/directories",
      "/reports",
      "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
      "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
      "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/"
    ];

    let user = await EximclientUser.findOne({ email: email.toLowerCase() });

    if (user) {
      console.log(`User '${email}' already exists. Updating...`);
      user.name = name;
      user.password = passwordPlain;
      user.emailVerified = true;
      user.verifiedEmail = true;
      user.isActive = true;
      user.status = "active";
      user.role = "user";
      user.assignedModules = modules;
      user.ie_code_assignments = [ieCodeAssignment];
      user.exporter_ie_code_assignments = [ieCodeAssignment];
      
      await user.save();
      console.log(`✅ User ${email} updated successfully!`);
    } else {
      console.log(`Creating user '${email}'...`);
      user = new EximclientUser({
        name: name,
        email: email.toLowerCase(),
        password: passwordPlain,
        emailVerified: true,
        verifiedEmail: true,
        isActive: true,
        status: "active",
        role: "user",
        assignedModules: modules,
        ie_code_assignments: [ieCodeAssignment],
        exporter_ie_code_assignments: [ieCodeAssignment]
      });

      await user.save();
      console.log(`✅ User ${email} created successfully!`);
    }

    // ----------------------------------------------------
    // 1. SEED FAKE IMPORT JOBS (jobs collection)
    // ----------------------------------------------------
    console.log(`\nClearing existing fake import jobs for IE ${fakeIeCode}...`);
    await JobModel.deleteMany({ ie_code_no: fakeIeCode });

    const fakeImportJobs = [
      {
        year: "26-27",
        job_number: "DEMO-IMP-02501",
        job_no: "DEMO-IMP-02501",
        custom_house: "MUNDRA SEA",
        job_date: "2026-08-01",
        importer: fakeCompanyName,
        ie_code_no: fakeIeCode,
        supplier_exporter: "ORCHID METAL SCRAP TRADING LLC",
        invoice_number: "INV/ORC/88102",
        invoice_date: "2026-07-20",
        awb_bl_no: "HLCUKW3260500811",
        awb_bl_date: "2026-07-22",
        description: "COPPER SCRAP BIRCH CLIFF",
        be_no: "2718739",
        be_date: "2026-08-02",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "18",
        unit: "MTS",
        gross_weight: "21610 kg",
        job_net_weight: "21510 kg",
        shipping_line_airline: "HAPAG LLOYD INDIA PRIVATE LIMITED",
        port_of_reporting: "INMUN1",
        loading_port: "Shuwaikh",
        origin_country: "Kuwait",
        consignment_type: "FCL",
        container_count: "1",
        no_of_container: "1",
        toi: "CIF",
        cif_amount: "152415.33 USD",
        assbl_value: "12845000.00",
        total_duty: "1480000.00",
        out_of_charge: "2026-08-05",
        status: "Pending",
        is_checklist_aprroved: true,
        is_checklist_aprroved_date: "2026-08-02 11:20:00 AM",
        container_nos: [
          {
            container_number: "HAMU1769376",
            size: "40'",
            net_weight: "21510",
            physical_weight: "21610",
            arrival_date: "2026-07-31",
            detention_from: "2026-08-14",
            delivery_date: "2026-08-04",
            transporter: "GUJARAT FREIGHT CARRIERS",
            vehicle_no: "GJ12BW9810",
            driver_name: "Ramesh Patel",
            driver_phone: "9825012345",
            seal_no: "HL1092837"
          }
        ]
      },
      {
        year: "26-27",
        job_number: "DEMO-IMP-02502",
        job_no: "DEMO-IMP-02502",
        custom_house: "ICD KHODIYAR",
        job_date: "2026-07-28",
        importer: fakeCompanyName,
        ie_code_no: fakeIeCode,
        supplier_exporter: "PEGASUS METALLURGY S.A.",
        invoice_number: "INV/PEG/2026/991",
        invoice_date: "2026-07-15",
        awb_bl_no: "GOLU4115724080",
        awb_bl_date: "2026-07-16",
        description: "ALUMINIUM INGOTS 99.7%",
        be_no: "2542606",
        be_date: "2026-07-30",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "24",
        unit: "MTS",
        gross_weight: "23300 kg",
        job_net_weight: "23200 kg",
        shipping_line_airline: "ORIENT OVERSEAS CONTAINER LINE LIMITED",
        port_of_reporting: "INSBI6",
        loading_port: "Thessaloniki",
        origin_country: "Greece",
        consignment_type: "FCL",
        container_count: "1",
        no_of_container: "1",
        toi: "CIF",
        cif_amount: "180071.00 USD",
        assbl_value: "15150000.00",
        total_duty: "1740000.00",
        out_of_charge: "2026-08-01",
        status: "Pending",
        is_checklist_aprroved: true,
        is_checklist_aprroved_date: "2026-07-29 02:45:00 PM",
        container_nos: [
          {
            container_number: "FSCU8889028",
            size: "40'",
            net_weight: "23200",
            physical_weight: "23300",
            arrival_date: "2026-07-27",
            detention_from: "2026-08-10",
            delivery_date: "2026-08-02",
            transporter: "SHREE RAM TRANSPORT",
            vehicle_no: "GJ01CZ4410",
            driver_name: "Suresh Kumar",
            driver_phone: "9898054321",
            seal_no: "OOCL998811"
          }
        ]
      },
      {
        year: "26-27",
        job_number: "DEMO-IMP-02503",
        job_no: "DEMO-IMP-02503",
        custom_house: "HAZIRA SEA",
        job_date: "2026-07-25",
        importer: fakeCompanyName,
        ie_code_no: fakeIeCode,
        supplier_exporter: "ALA RECYCLING LLC SP",
        invoice_number: "INV/ALA/7721",
        invoice_date: "2026-07-10",
        awb_bl_no: "MEDUMU724781",
        awb_bl_date: "2026-07-12",
        description: "STAINLESS STEEL SCRAP 304",
        be_no: "2677380",
        be_date: "2026-07-26",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "20",
        unit: "MTS",
        gross_weight: "22315 kg",
        job_net_weight: "22200 kg",
        shipping_line_airline: "POSEIDON SHIPPING AGENCY PVT LTD",
        port_of_reporting: "INHZA1",
        loading_port: "Jebel Ali",
        origin_country: "United Arab Emirates",
        consignment_type: "FCL",
        container_count: "1",
        no_of_container: "1",
        toi: "CIF",
        cif_amount: "142500.00 USD",
        assbl_value: "11980000.00",
        total_duty: "1370000.00",
        out_of_charge: "2026-07-29",
        status: "Pending",
        is_checklist_aprroved: true,
        is_checklist_aprroved_date: "2026-07-26 10:15:00 AM",
        container_nos: [
          {
            container_number: "SELU4317083",
            size: "40'",
            net_weight: "22200",
            physical_weight: "22315",
            arrival_date: "2026-07-24",
            detention_from: "2026-08-07",
            delivery_date: "2026-07-30",
            transporter: "VLOGISTICS PVT LTD",
            vehicle_no: "GJ05AV1122",
            driver_name: "Mahesh Rabari",
            driver_phone: "9712398765",
            seal_no: "MSCSL5544"
          }
        ]
      }
    ];

    await JobModel.insertMany(fakeImportJobs);
    console.log(`✅ Inserted ${fakeImportJobs.length} fake import jobs into 'jobs' collection.`);

    // ----------------------------------------------------
    // 2. SEED FAKE EXPORT JOBS (ex_jobs collection)
    // ----------------------------------------------------
    const ExJobModel = mongoose.model("ExJob", new mongoose.Schema({}, { strict: false }), "ex_jobs");

    console.log(`\nClearing existing fake export jobs for IE ${fakeIeCode}...`);
    await ExJobModel.deleteMany({
      $or: [{ ieCode: fakeIeCode }, { exporter_ie_code: fakeIeCode }]
    });

    const fakeExportJobs = [
      {
        job_no: "AMD/EXP/SEA/00101/26-27",
        job_date: "2026-08-01",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "MUNDRA SEA",
        sb_no: "8890123",
        sb_date: "2026-08-04",
        consignee_name: "GULF METALS TRADING FZE",
        consignees: [{ consignee_name: "GULF METALS TRADING FZE" }],
        consignee_address: "P.O. BOX 18293, JEBEL ALI FREE ZONE, DUBAI, UAE",
        destination_port: "JEBEL ALI",
        port_of_discharge: "JEBEL ALI",
        vessel_name: "MSC EMMA",
        voyage_no: "2608W",
        status: "pending",
        consignmentType: "FCL",
        fob_value: "68500.00",
        currency: "USD",
        container_count: 2,
        containers: [
          { containerNo: "MSKU8765432", containerSize: "40", sealNo: "SL998877" },
          { containerNo: "MSKU8765433", containerSize: "40", sealNo: "SL998878" }
        ],
        operations: { statusDetails: {} }
      },
      {
        job_no: "AMD/EXP/SEA/00102/26-27",
        job_date: "2026-08-05",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "ICD SANAND",
        sb_no: "8891440",
        sb_date: "2026-08-08",
        consignee_name: "EUROPEAN INDUSTRIAL SCRAP GMBH",
        consignees: [{ consignee_name: "EUROPEAN INDUSTRIAL SCRAP GMBH" }],
        consignee_address: "INDUSTRIESTRASSE 44, 20457 HAMBURG, GERMANY",
        destination_port: "HAMBURG",
        port_of_discharge: "HAMBURG",
        vessel_name: "MAERSK HANOI",
        voyage_no: "249E",
        status: "pending",
        consignmentType: "FCL",
        fob_value: "92100.00",
        currency: "USD",
        container_count: 1,
        containers: [
          { containerNo: "MRSK9912048", containerSize: "40", sealNo: "MSK001122" }
        ],
        operations: { statusDetails: {} }
      },
      {
        job_no: "AMD/EXP/SEA/00103/26-27",
        job_date: "2026-08-09",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "HAZIRA SEA",
        sb_no: "8892551",
        sb_date: "2026-08-11",
        consignee_name: "AMERICAN RECYCLING CORP",
        consignees: [{ consignee_name: "AMERICAN RECYCLING CORP" }],
        consignee_address: "100 OCEAN PARKWAY, HOUSTON, TX 77001, USA",
        destination_port: "HOUSTON",
        port_of_discharge: "HOUSTON",
        vessel_name: "HAPAG EXPRESS",
        voyage_no: "881S",
        status: "pending",
        consignmentType: "FCL",
        fob_value: "115000.00",
        currency: "USD",
        container_count: 3,
        containers: [
          { containerNo: "HLXU4419021", containerSize: "40", sealNo: "HL556677" }
        ],
        operations: { statusDetails: {} }
      }
    ];

    await ExJobModel.insertMany(fakeExportJobs);
    console.log(`✅ Inserted ${fakeExportJobs.length} fake export jobs into 'ex_jobs' collection.`);

    // ----------------------------------------------------
    // 3. SEED FAKE E-LOCK DETAILS (elockdetails collection)
    // ----------------------------------------------------
    console.log(`\nClearing existing fake E-Lock details for IE ${fakeIeCode}...`);
    await ElockDetail.deleteMany({ ie_code: fakeIeCode });

    const fakeElocks = [
      {
        ie_code: fakeIeCode,
        created_by: user._id,
        elock_number: "ELOCK-90812",
        status: "ASSIGNED",
        vehicle_number: "GJ12BW9810",
        driver_name: "Ramesh Patel",
        driver_phone: "9825012345",
        consignor: "ORCHID METAL SCRAP TRADING LLC",
        consignee: fakeCompanyName
      },
      {
        ie_code: fakeIeCode,
        created_by: user._id,
        elock_number: "ELOCK-90813",
        status: "ASSIGNED",
        vehicle_number: "GJ01CZ4410",
        driver_name: "Suresh Kumar",
        driver_phone: "9898054321",
        consignor: "PEGASUS METALLURGY S.A.",
        consignee: fakeCompanyName
      },
      {
        ie_code: fakeIeCode,
        created_by: user._id,
        elock_number: "ELOCK-90814",
        status: "RETURNED",
        vehicle_number: "GJ05AV1122",
        driver_name: "Mahesh Rabari",
        driver_phone: "9712398765",
        consignor: "ALA RECYCLING LLC SP",
        consignee: fakeCompanyName
      }
    ];

    await ElockDetail.insertMany(fakeElocks);
    console.log(`✅ Inserted ${fakeElocks.length} fake E-Locks into 'elockdetails' collection.`);

    // ----------------------------------------------------
    // 4. SEED FAKE DGFT AUTHORIZATIONS & RODTEPS
    // ----------------------------------------------------
    const AuthModel = mongoose.model("authorizationregistration", new mongoose.Schema({}, { strict: false }), "authorizationregistrations");
    const RodtepModel = mongoose.model("rodtep", new mongoose.Schema({}, { strict: false }), "rodteps");

    console.log(`\nClearing existing fake DGFT data for IE ${fakeIeCode}...`);
    await AuthModel.deleteMany({ iec_no: fakeIeCode });
    await RodtepModel.deleteMany({ iec_code: fakeIeCode });

    const fakeAuths = [
      {
        job_no: "DGFT/ADV/2026/001",
        job_status: "Active",
        party_name: fakeCompanyName,
        iec_no: fakeIeCode,
        category: "Advance Licence",
        licence_no: "0110892014",
        registration_no: "REG/2026/0991",
        licence_date: "2026-01-15",
        auth_date: "2026-01-15",
        scheme_code: "01 - Advance Authorisation",
        licence_amount: "2500000",
        port_code: "INMUN1",
        bond_number: "BOND/2026/881",
        bond_amount: "3000000",
        import_validity: "2027-01-14",
        export_validity: "2027-07-14",
        hs_code_import: "74040012",
        import_item_description: "COPPER SCRAP BIRCH CLIFF",
        import_qty: "100",
        import_unit: "MTS",
        import_value_usd: "750000"
      },
      {
        job_no: "DGFT/EPCG/2026/002",
        job_status: "Active",
        party_name: fakeCompanyName,
        iec_no: fakeIeCode,
        category: "EPCG Licence",
        licence_no: "0110892015",
        registration_no: "REG/2026/0992",
        licence_date: "2026-02-10",
        auth_date: "2026-02-10",
        scheme_code: "02 - EPCG Scheme",
        licence_amount: "5000000",
        port_code: "INMUN1",
        bond_number: "BOND/2026/882",
        bond_amount: "6000000",
        import_validity: "2028-02-09",
        export_validity: "2032-02-09",
        hs_code_import: "84596000",
        import_item_description: "HIGH PRECISION METALWORKING MILLING MACHINE",
        import_qty: "2",
        import_unit: "NOS",
        import_value_usd: "1500000"
      }
    ];

    const fakeRodteps = [
      {
        sr_no: 1,
        rodtep: "RODTEP/2026/99120",
        issue_date: "2026-03-10",
        expiry_date: "2027-03-09",
        value_inr: 145000,
        iec_code: fakeIeCode,
        port_code: "INMUN1"
      },
      {
        sr_no: 2,
        rodtep: "RODTEP/2026/99121",
        issue_date: "2026-04-05",
        expiry_date: "2027-04-04",
        value_inr: 88500,
        iec_code: fakeIeCode,
        port_code: "INSBI6"
      }
    ];

    await AuthModel.insertMany(fakeAuths);
    await RodtepModel.insertMany(fakeRodteps);
    console.log(`✅ Inserted ${fakeAuths.length} fake DGFT licences and ${fakeRodteps.length} fake RoDTEP scrips.`);

    // ----------------------------------------------------
    // 5. SEED FAKE OPEN POINTS (openpointprojects / openpoints collection)
    // ----------------------------------------------------
    console.log(`\nClearing existing fake Open Points...`);
    await OpenPointProjectModel.deleteMany({ initials: "NILO" });

    const project = await OpenPointProjectModel.create({
      name: "Novusha Impex Logistics Optimization",
      initials: "NILO",
      description: "Demo project tracking for Novusha Client",
      owner: user._id,
      status: "Active"
    });

    const fakeOpenPoints = [
      {
        project_id: project._id,
        title: "AEO Tier-2 Document Submission",
        description: "Submit revised financial audits for AEO Tier-2 certification renewal.",
        priority: "High",
        status: "Yellow",
        responsibility: "Logistics Desk",
        created_by: user._id,
        target_date: new Date("2026-08-20")
      },
      {
        project_id: project._id,
        title: "Shipping Line Free Time Extension Request",
        description: "Request Hapag-Lloyd for 21-day free time approval on upcoming scrap shipments.",
        priority: "Medium",
        status: "Green",
        responsibility: "Import Team",
        created_by: user._id,
        target_date: new Date("2026-08-25")
      }
    ];

    await OpenPointModel.insertMany(fakeOpenPoints);
    console.log(`✅ Inserted ${fakeOpenPoints.length} fake open points.`);

    console.log("\n==========================================");
    console.log("🎉 NOVUSHA DEMO CLIENT FULLY SETUP WITH ALL MODULES & FAKE DATA!");
    console.log(`   User Email: ${email}`);
    console.log(`   Password:   ${passwordPlain}`);
    console.log(`   IE Code:    ${fakeIeCode}`);
    console.log(`   Company:    ${fakeCompanyName}`);
    console.log("==========================================\n");

  } catch (err) {
    console.error("Error setting up Novusha demo client:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

run();
