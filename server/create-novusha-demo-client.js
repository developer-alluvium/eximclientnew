import mongoose from "mongoose";
import dotenv from "dotenv";
import EximclientUser from "./models/eximclientUserModel.js";
import JobModel from "./models/jobModel.js";
import ElockDetail from "./models/ElockDetail.js";
import OpenPointModel from "./models/openPoints/openPointModel.js";
import OpenPointProjectModel from "./models/openPoints/openPointProjectModel.js";

dotenv.config();

const run = async () => {
  const mongoURI = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim";
  console.log("Connecting to MongoDB database...");

  try {
    await mongoose.connect(mongoURI);
    console.log("Connected successfully to database.");

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
        invoice_amount: "152415.33 USD",
        awb_bl_no: "HLCUKW3260500811",
        awb_bl_date: "2026-07-22",
        description: "COPPER SCRAP BIRCH CLIFF",
        be_no: "2718739",
        be_date: "2026-08-02",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "180",
        unit: "BAGS",
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
        assessable_ammount: "12845000.00",
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
        invoice_amount: "180071.00 USD",
        awb_bl_no: "GOLU4115724080",
        awb_bl_date: "2026-07-16",
        description: "ALUMINIUM INGOTS 99.7%",
        be_no: "2542606",
        be_date: "2026-07-30",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "24",
        unit: "PALLETS",
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
        assessable_ammount: "15150000.00",
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
        invoice_amount: "142500.00 USD",
        awb_bl_no: "MEDUMU724781",
        awb_bl_date: "2026-07-12",
        description: "STAINLESS STEEL SCRAP 304",
        be_no: "2677380",
        be_date: "2026-07-26",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "200",
        unit: "BAGS",
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
        assessable_ammount: "11980000.00",
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
      },
      {
        year: "26-27",
        job_number: "DEMO-IMP-02504",
        job_no: "DEMO-IMP-02504",
        custom_house: "NHAVA SHEVA SEA",
        job_date: "2026-08-10",
        importer: fakeCompanyName,
        ie_code_no: fakeIeCode,
        supplier_exporter: "AMERICAN RECYCLING CORP",
        invoice_number: "INV/ARC/2026/104",
        invoice_date: "2026-07-25",
        invoice_amount: "210000.00 USD",
        awb_bl_no: "MAEU9901827",
        awb_bl_date: "2026-07-28",
        description: "HEAVY MELTING SCRAP 1 & 2",
        be_no: "2899012",
        be_date: "2026-08-11",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "250",
        unit: "BAGS",
        gross_weight: "26500 kg",
        job_net_weight: "26400 kg",
        shipping_line_airline: "MAERSK LINE",
        port_of_reporting: "INNSA1",
        loading_port: "Houston",
        origin_country: "United States",
        consignment_type: "FCL",
        container_count: "2",
        no_of_container: "2",
        toi: "CIF",
        cif_amount: "210000.00 USD",
        assbl_value: "17640000.00",
        assessable_ammount: "17640000.00",
        total_duty: "2020000.00",
        out_of_charge: "2026-08-15",
        status: "Pending",
        is_checklist_aprroved: true,
        is_checklist_aprroved_date: "2026-08-11 04:30:00 PM",
        container_nos: [
          {
            container_number: "MRSK4455112",
            size: "40'",
            net_weight: "13200",
            physical_weight: "13250",
            arrival_date: "2026-08-09",
            detention_from: "2026-08-23",
            delivery_date: "2026-08-14",
            transporter: "ALLIANCE FREIGHT MOVERS",
            vehicle_no: "GJ12AZ5544",
            driver_name: "Vikram Singh",
            driver_phone: "9811223344",
            seal_no: "MSK778899"
          },
          {
            container_number: "MRSK4455113",
            size: "40'",
            net_weight: "13200",
            physical_weight: "13250",
            arrival_date: "2026-08-09",
            detention_from: "2026-08-23",
            delivery_date: "2026-08-14",
            transporter: "ALLIANCE FREIGHT MOVERS",
            vehicle_no: "GJ12AZ5545",
            driver_name: "Karan Johar",
            driver_phone: "9811223345",
            seal_no: "MSK778900"
          }
        ]
      },
      {
        year: "26-27",
        job_number: "DEMO-IMP-02505",
        job_no: "DEMO-IMP-02505",
        custom_house: "MUNDRA SEA",
        job_date: "2026-08-15",
        importer: fakeCompanyName,
        ie_code_no: fakeIeCode,
        supplier_exporter: "EUROPEAN INDUSTRIAL SCRAP GMBH",
        invoice_number: "INV/EIS/88901",
        invoice_date: "2026-08-01",
        invoice_amount: "195000.00 USD",
        awb_bl_no: "CMA99021445",
        awb_bl_date: "2026-08-03",
        description: "BRASS SCRAP HONEY",
        be_no: "2954101",
        be_date: "2026-08-16",
        type_of_b_e: "Home Consumption",
        no_of_pkgs: "160",
        unit: "BAGS",
        gross_weight: "24100 kg",
        job_net_weight: "24000 kg",
        shipping_line_airline: "CMA CGM AGENCIES INDIA PVT LTD",
        port_of_reporting: "INMUN1",
        loading_port: "Hamburg",
        origin_country: "Germany",
        consignment_type: "FCL",
        container_count: "1",
        no_of_container: "1",
        toi: "CIF",
        cif_amount: "195000.00 USD",
        assbl_value: "16380000.00",
        assessable_ammount: "16380000.00",
        total_duty: "1880000.00",
        out_of_charge: "2026-08-20",
        status: "Pending",
        is_checklist_aprroved: true,
        is_checklist_aprroved_date: "2026-08-16 09:00:00 AM",
        container_nos: [
          {
            container_number: "CMAU9081234",
            size: "40'",
            net_weight: "24000",
            physical_weight: "24100",
            arrival_date: "2026-08-14",
            detention_from: "2026-08-28",
            delivery_date: "2026-08-19",
            transporter: "SHIV LOGISTICS & TRANSPORT",
            vehicle_no: "GJ03BV7788",
            driver_name: "Dinesh Sharma",
            driver_phone: "9977665544",
            seal_no: "CMA551122"
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
        job_number: "AMD/EXP/SEA/00101/26-27",
        year: "26-27",
        job_date: "2026-08-01",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "MUNDRA SEA",
        sb_no: "8890123",
        sb_date: "2026-08-04",
        shipping_bill_done_date: "2026-08-04",
        consignee_name: "GULF METALS TRADING FZE",
        consignees: [
          {
            consignee_name: "GULF METALS TRADING FZE",
            consignee_address: "P.O. BOX 18293, JEBEL ALI FREE ZONE, DUBAI, UAE"
          }
        ],
        consignee_address: "P.O. BOX 18293, JEBEL ALI FREE ZONE, DUBAI, UAE",
        port_of_loading: "MUNDRA SEA",
        port_of_discharge: "JEBEL ALI",
        destination_port: "JEBEL ALI",
        destination_country: "United Arab Emirates",
        vessel_name: "MSC EMMA",
        voyage_no: "2608W",
        shipping_line_airline: "MAERSK LINE",
        booking_no: "BK/MSK/990812",
        forwarder: "ALLUVIUM LOGISTICS PVT LTD",
        status: "Pending",
        detailedStatus: ["Pending"],
        consignmentType: "FCL",
        fob_value: "68500.00",
        invoiceValue: 68500.00,
        product_value: 68500.00,
        freight_amount: 2500.00,
        insurance_amount: 350.00,
        currency: "USD",
        exchangeRate: 83.50,
        invoiceNumber: "INV/EXP/2026/001",
        invoiceDate: "2026-08-02",
        termsOfInvoice: "FOB",
        total_no_of_pkgs: 180,
        package_unit: "BAGS",
        gross_weight_kg: 21610,
        net_weight_kg: 21510,
        vgm_date: "2026-08-04",
        form13_date: "2026-08-05",
        invoices: [
          {
            invoiceNumber: "INV/EXP/2026/001",
            invoiceDate: "2026-08-02",
            termsOfInvoice: "FOB",
            currency: "USD",
            exchangeRate: 83.50,
            invoiceValue: 68500.00,
            productValue: 68500.00,
            fobValue: 68500.00,
            freightInsuranceCharges: {
              freight: { amount: 2500, currency: "USD" },
              insurance: { amount: 350, currency: "USD" }
            },
            buyerThirdPartyInfo: {
              buyer: { name: "GULF METALS TRADING FZE" },
              thirdParty: { name: "GLOBAL RECYCLING PARTNERS LTD" }
            },
            eximCode: "60 (DRAWBACK AND ROSCTL)",
            drawback_scroll_no: "DBK-2026-9081",
            drawback_scroll_date: "2026-08-06",
            rosctl_scroll_no: "ROS-2026-1042",
            rosctl_scroll_date: "2026-08-06"
          }
        ],
        container_count: 2,
        containers: [
          { containerNo: "MSKU8765432", containerSize: "40", container_type: "HC", sealNo: "SL998877", pkgsStuffed: 90, grossWeight: 10800 },
          { containerNo: "MSKU8765433", containerSize: "40", container_type: "HC", sealNo: "SL998878", pkgsStuffed: 90, grossWeight: 10810 }
        ],
        operations: [
          {
            statusDetails: [
              {
                leoDate: "2026-08-06",
                stuffingDate: "2026-08-04",
                handoverForwardingNoteDate: "2026-08-05",
                handoverConcorTharSanganaRailRoadDate: "2026-08-07",
                railOutReachedDate: "2026-08-08",
                railRoad: "rail",
                forwarderName: "ALLUVIUM LOGISTICS PVT LTD",
                billing_details: {
                  agency_bill_date: "2026-08-10",
                  reimbursement_bill_date: "2026-08-10"
                }
              }
            ]
          }
        ]
      },
      {
        job_no: "AMD/EXP/SEA/00102/26-27",
        job_number: "AMD/EXP/SEA/00102/26-27",
        year: "26-27",
        job_date: "2026-08-05",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "ICD SANAND",
        sb_no: "8891440",
        sb_date: "2026-08-08",
        shipping_bill_done_date: "2026-08-08",
        consignee_name: "EUROPEAN INDUSTRIAL SCRAP GMBH",
        consignees: [
          {
            consignee_name: "EUROPEAN INDUSTRIAL SCRAP GMBH",
            consignee_address: "INDUSTRIESTRASSE 44, 20457 HAMBURG, GERMANY"
          }
        ],
        consignee_address: "INDUSTRIESTRASSE 44, 20457 HAMBURG, GERMANY",
        port_of_loading: "ICD SANAND",
        port_of_discharge: "HAMBURG",
        destination_port: "HAMBURG",
        destination_country: "Germany",
        vessel_name: "MAERSK HANOI",
        voyage_no: "249E",
        shipping_line_airline: "MAERSK LINE",
        booking_no: "BK/MSK/990920",
        forwarder: "SURAJ FORWARDERS PVT LTD",
        status: "SB Filed",
        detailedStatus: ["SB Filed"],
        consignmentType: "FCL",
        fob_value: "92100.00",
        invoiceValue: 92100.00,
        product_value: 92100.00,
        freight_amount: 3200.00,
        insurance_amount: 450.00,
        currency: "USD",
        exchangeRate: 83.50,
        invoiceNumber: "INV/EXP/2026/002",
        invoiceDate: "2026-08-06",
        termsOfInvoice: "CIF",
        total_no_of_pkgs: 24,
        package_unit: "PALLETS",
        gross_weight_kg: 23300,
        net_weight_kg: 23200,
        vgm_date: "2026-08-08",
        form13_date: "2026-08-09",
        invoices: [
          {
            invoiceNumber: "INV/EXP/2026/002",
            invoiceDate: "2026-08-06",
            termsOfInvoice: "CIF",
            currency: "USD",
            exchangeRate: 83.50,
            invoiceValue: 92100.00,
            productValue: 92100.00,
            fobValue: 92100.00,
            freightInsuranceCharges: {
              freight: { amount: 3200, currency: "USD" },
              insurance: { amount: 450, currency: "USD" }
            },
            buyerThirdPartyInfo: {
              buyer: { name: "EUROPEAN INDUSTRIAL SCRAP GMBH" },
              thirdParty: { name: "HEAVY METALS GMBH" }
            },
            eximCode: "60 (DRAWBACK AND ROSCTL)"
          }
        ],
        container_count: 1,
        containers: [
          { containerNo: "MRSK9912048", containerSize: "40", container_type: "HC", sealNo: "MSK001122", pkgsStuffed: 24, grossWeight: 23300 }
        ],
        operations: [
          {
            statusDetails: [
              {
                leoDate: "2026-08-10",
                stuffingDate: "2026-08-07",
                handoverForwardingNoteDate: "2026-08-08",
                handoverConcorTharSanganaRailRoadDate: "2026-08-09",
                railOutReachedDate: "2026-08-11",
                railRoad: "rail",
                forwarderName: "SURAJ FORWARDERS PVT LTD",
                billing_details: {
                  agency_bill_date: "2026-08-12",
                  reimbursement_bill_date: "2026-08-12"
                }
              }
            ]
          }
        ]
      },
      {
        job_no: "AMD/EXP/SEA/00103/26-27",
        job_number: "AMD/EXP/SEA/00103/26-27",
        year: "26-27",
        job_date: "2026-08-09",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "HAZIRA SEA",
        sb_no: "8892551",
        sb_date: "2026-08-11",
        shipping_bill_done_date: "2026-08-11",
        consignee_name: "AMERICAN RECYCLING CORP",
        consignees: [
          {
            consignee_name: "AMERICAN RECYCLING CORP",
            consignee_address: "100 OCEAN PARKWAY, HOUSTON, TX 77001, USA"
          }
        ],
        consignee_address: "100 OCEAN PARKWAY, HOUSTON, TX 77001, USA",
        port_of_loading: "HAZIRA SEA",
        port_of_discharge: "HOUSTON",
        destination_port: "HOUSTON",
        destination_country: "United States",
        vessel_name: "HAPAG EXPRESS",
        voyage_no: "881S",
        shipping_line_airline: "HAPAG LLOYD",
        booking_no: "BK/HL/771092",
        forwarder: "APEX FREIGHT SERVICES",
        status: "L.E.O",
        detailedStatus: ["L.E.O"],
        consignmentType: "FCL",
        fob_value: "115000.00",
        invoiceValue: 115000.00,
        product_value: 115000.00,
        freight_amount: 4100.00,
        insurance_amount: 550.00,
        currency: "USD",
        exchangeRate: 83.50,
        invoiceNumber: "INV/EXP/2026/003",
        invoiceDate: "2026-08-10",
        termsOfInvoice: "CIF",
        total_no_of_pkgs: 200,
        package_unit: "BAGS",
        gross_weight_kg: 22315,
        net_weight_kg: 22200,
        vgm_date: "2026-08-11",
        form13_date: "2026-08-12",
        invoices: [
          {
            invoiceNumber: "INV/EXP/2026/003",
            invoiceDate: "2026-08-10",
            termsOfInvoice: "CIF",
            currency: "USD",
            exchangeRate: 83.50,
            invoiceValue: 115000.00,
            productValue: 115000.00,
            fobValue: 115000.00,
            freightInsuranceCharges: {
              freight: { amount: 4100, currency: "USD" },
              insurance: { amount: 550, currency: "USD" }
            },
            buyerThirdPartyInfo: {
              buyer: { name: "AMERICAN RECYCLING CORP" },
              thirdParty: { name: "US METAL TRADERS INC" }
            },
            eximCode: "DRAWBACK"
          }
        ],
        container_count: 1,
        containers: [
          { containerNo: "HLXU4419021", containerSize: "40", container_type: "HC", sealNo: "HL556677", pkgsStuffed: 200, grossWeight: 22315 }
        ],
        operations: [
          {
            statusDetails: [
              {
                leoDate: "2026-08-13",
                stuffingDate: "2026-08-11",
                handoverForwardingNoteDate: "2026-08-12",
                handoverConcorTharSanganaRailRoadDate: "2026-08-13",
                railOutReachedDate: "2026-08-14",
                railRoad: "rail",
                forwarderName: "APEX FREIGHT SERVICES",
                billing_details: {
                  agency_bill_date: "2026-08-15",
                  reimbursement_bill_date: "2026-08-15"
                }
              }
            ]
          }
        ]
      },
      {
        job_no: "AMD/EXP/SEA/00104/26-27",
        job_number: "AMD/EXP/SEA/00104/26-27",
        year: "26-27",
        job_date: "2026-08-12",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "MUNDRA SEA",
        sb_no: "8893882",
        sb_date: "2026-08-14",
        shipping_bill_done_date: "2026-08-14",
        consignee_name: "BELGIUM METAL SCRAP NV",
        consignees: [
          {
            consignee_name: "BELGIUM METAL SCRAP NV",
            consignee_address: "HAVEN 1022, 2030 ANTWERP, BELGIUM"
          }
        ],
        consignee_address: "HAVEN 1022, 2030 ANTWERP, BELGIUM",
        port_of_loading: "MUNDRA SEA",
        port_of_discharge: "ANTWERP",
        destination_port: "ANTWERP",
        destination_country: "Belgium",
        vessel_name: "CMA CGM OPERA",
        voyage_no: "9910N",
        shipping_line_airline: "CMA CGM",
        booking_no: "BK/CMA/102938",
        forwarder: "GLOBAL FREIGHT LOGISTICS",
        status: "Container HO",
        detailedStatus: ["Container HO"],
        consignmentType: "FCL",
        fob_value: "84000.00",
        invoiceValue: 84000.00,
        product_value: 84000.00,
        freight_amount: 2900.00,
        insurance_amount: 400.00,
        currency: "USD",
        exchangeRate: 83.50,
        invoiceNumber: "INV/EXP/2026/004",
        invoiceDate: "2026-08-13",
        termsOfInvoice: "CIF",
        total_no_of_pkgs: 150,
        package_unit: "BAGS",
        gross_weight_kg: 19800,
        net_weight_kg: 19700,
        vgm_date: "2026-08-14",
        form13_date: "2026-08-15",
        invoices: [
          {
            invoiceNumber: "INV/EXP/2026/004",
            invoiceDate: "2026-08-13",
            termsOfInvoice: "CIF",
            currency: "USD",
            exchangeRate: 83.50,
            invoiceValue: 84000.00,
            productValue: 84000.00,
            fobValue: 84000.00,
            freightInsuranceCharges: {
              freight: { amount: 2900, currency: "USD" },
              insurance: { amount: 400, currency: "USD" }
            },
            buyerThirdPartyInfo: {
              buyer: { name: "BELGIUM METAL SCRAP NV" },
              thirdParty: { name: "EUROPE TRADING S.A." }
            },
            eximCode: "DRAWBACK"
          }
        ],
        container_count: 1,
        containers: [
          { containerNo: "CMAU7718290", containerSize: "40", container_type: "HC", sealNo: "CMA990011", pkgsStuffed: 150, grossWeight: 19800 }
        ],
        operations: [
          {
            statusDetails: [
              {
                leoDate: "2026-08-16",
                stuffingDate: "2026-08-14",
                handoverForwardingNoteDate: "2026-08-15",
                handoverConcorTharSanganaRailRoadDate: "2026-08-16",
                railOutReachedDate: "2026-08-17",
                railRoad: "rail",
                forwarderName: "GLOBAL FREIGHT LOGISTICS",
                billing_details: {
                  agency_bill_date: "2026-08-18",
                  reimbursement_bill_date: "2026-08-18"
                }
              }
            ]
          }
        ]
      },
      {
        job_no: "AMD/EXP/SEA/00105/26-27",
        job_number: "AMD/EXP/SEA/00105/26-27",
        year: "26-27",
        job_date: "2026-08-15",
        ieCode: fakeIeCode,
        exporter_ie_code: fakeIeCode,
        exporter: fakeCompanyName,
        exporter_name: fakeCompanyName,
        branch_code: "AMD",
        custom_house: "NHAVA SHEVA SEA",
        sb_no: "8894105",
        sb_date: "2026-08-17",
        shipping_bill_done_date: "2026-08-17",
        consignee_name: "SINGAPORE METALS PTE LTD",
        consignees: [
          {
            consignee_name: "SINGAPORE METALS PTE LTD",
            consignee_address: "10 MARINA BOULEVARD, MARINA BAY FINANCIAL CENTRE, SINGAPORE"
          }
        ],
        consignee_address: "10 MARINA BOULEVARD, MARINA BAY FINANCIAL CENTRE, SINGAPORE",
        port_of_loading: "NHAVA SHEVA SEA",
        port_of_discharge: "SINGAPORE",
        destination_port: "SINGAPORE",
        destination_country: "Singapore",
        vessel_name: "ONE OLYMPUS",
        voyage_no: "082S",
        shipping_line_airline: "ONE LINE",
        booking_no: "BK/ONE/554411",
        forwarder: "OCEANIC FREIGHT FORWARDERS",
        status: "Completed",
        detailedStatus: ["Completed"],
        consignmentType: "FCL",
        fob_value: "135000.00",
        invoiceValue: 135000.00,
        product_value: 135000.00,
        freight_amount: 1800.00,
        insurance_amount: 300.00,
        currency: "USD",
        exchangeRate: 83.50,
        invoiceNumber: "INV/EXP/2026/005",
        invoiceDate: "2026-08-16",
        termsOfInvoice: "FOB",
        total_no_of_pkgs: 300,
        package_unit: "BAGS",
        gross_weight_kg: 28500,
        net_weight_kg: 28400,
        vgm_date: "2026-08-17",
        form13_date: "2026-08-18",
        invoices: [
          {
            invoiceNumber: "INV/EXP/2026/005",
            invoiceDate: "2026-08-16",
            termsOfInvoice: "FOB",
            currency: "USD",
            exchangeRate: 83.50,
            invoiceValue: 135000.00,
            productValue: 135000.00,
            fobValue: 135000.00,
            freightInsuranceCharges: {
              freight: { amount: 1800, currency: "USD" },
              insurance: { amount: 300, currency: "USD" }
            },
            buyerThirdPartyInfo: {
              buyer: { name: "SINGAPORE METALS PTE LTD" },
              thirdParty: { name: "PACIFIC ASIA SCRAP TRADING" }
            },
            eximCode: "ROSCTL"
          }
        ],
        container_count: 2,
        containers: [
          { containerNo: "ONEU3344101", containerSize: "40", container_type: "HC", sealNo: "ONE771122", pkgsStuffed: 150, grossWeight: 14250 },
          { containerNo: "ONEU3344102", containerSize: "40", container_type: "HC", sealNo: "ONE771123", pkgsStuffed: 150, grossWeight: 14250 }
        ],
        operations: [
          {
            statusDetails: [
              {
                leoDate: "2026-08-19",
                stuffingDate: "2026-08-17",
                handoverForwardingNoteDate: "2026-08-18",
                handoverConcorTharSanganaRailRoadDate: "2026-08-19",
                railOutReachedDate: "2026-08-20",
                railRoad: "rail",
                forwarderName: "OCEANIC FREIGHT FORWARDERS",
                billing_details: {
                  agency_bill_date: "2026-08-21",
                  reimbursement_bill_date: "2026-08-21"
                }
              }
            ]
          }
        ]
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
        consignee: fakeCompanyName,
        destination: "Mundra Port CFS Yard",
        trip_start_time: new Date("2026-08-01T08:00:00Z"),
        trip_end_time: new Date("2026-08-01T16:30:00Z"),
        battery_level: 94,
        gps_coordinates: "22.8395, 69.7025"
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
        consignee: fakeCompanyName,
        destination: "ICD Khodiyar Yard",
        trip_start_time: new Date("2026-08-05T09:15:00Z"),
        trip_end_time: new Date("2026-08-05T18:00:00Z"),
        battery_level: 88,
        gps_coordinates: "23.1250, 72.5400"
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
        consignee: fakeCompanyName,
        destination: "Hazira Port Complex",
        trip_start_time: new Date("2026-08-10T07:30:00Z"),
        trip_end_time: new Date("2026-08-10T14:45:00Z"),
        battery_level: 100,
        gps_coordinates: "21.1000, 72.6333"
      },
      {
        ie_code: fakeIeCode,
        created_by: user._id,
        elock_number: "ELOCK-90815",
        status: "ASSIGNED",
        vehicle_number: "GJ12AZ5544",
        driver_name: "Vikram Singh",
        driver_phone: "9811223344",
        consignor: "AMERICAN RECYCLING CORP",
        consignee: fakeCompanyName,
        destination: "Nhava Sheva JNPT Yard",
        trip_start_time: new Date("2026-08-12T10:00:00Z"),
        trip_end_time: new Date("2026-08-12T19:00:00Z"),
        battery_level: 91,
        gps_coordinates: "18.9500, 72.9500"
      },
      {
        ie_code: fakeIeCode,
        created_by: user._id,
        elock_number: "ELOCK-90816",
        status: "UNASSIGNED",
        vehicle_number: "GJ03BV7788",
        driver_name: "Dinesh Sharma",
        driver_phone: "9977665544",
        consignor: "EUROPEAN INDUSTRIAL SCRAP GMBH",
        consignee: fakeCompanyName,
        destination: "Mundra SEZ Terminal",
        trip_start_time: new Date("2026-08-16T06:45:00Z"),
        trip_end_time: new Date("2026-08-16T15:30:00Z"),
        battery_level: 85,
        gps_coordinates: "22.8400, 69.7100"
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
      },
      {
        job_no: "DGFT/DFIA/2026/003",
        job_status: "Active",
        party_name: fakeCompanyName,
        iec_no: fakeIeCode,
        category: "DFIA Licence",
        licence_no: "0110892016",
        registration_no: "REG/2026/0993",
        licence_date: "2026-03-01",
        auth_date: "2026-03-01",
        scheme_code: "03 - Duty Free Import Authorisation",
        licence_amount: "1800000",
        port_code: "INSBI6",
        bond_number: "BOND/2026/883",
        bond_amount: "2200000",
        import_validity: "2027-02-28",
        export_validity: "2027-08-31",
        hs_code_import: "76020010",
        import_item_description: "ALUMINIUM SCRAP TAINT TABOR",
        import_qty: "80",
        import_unit: "MTS",
        import_value_usd: "450000"
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
        port_code: "INMUN1",
        status: "Active"
      },
      {
        sr_no: 2,
        rodtep: "RODTEP/2026/99121",
        issue_date: "2026-04-05",
        expiry_date: "2027-04-04",
        value_inr: 88500,
        iec_code: fakeIeCode,
        port_code: "INSBI6",
        status: "Active"
      },
      {
        sr_no: 3,
        rodtep: "RODTEP/2026/99122",
        issue_date: "2026-05-15",
        expiry_date: "2027-05-14",
        value_inr: 210000,
        iec_code: fakeIeCode,
        port_code: "INHZA1",
        status: "Active"
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
      },
      {
        project_id: project._id,
        title: "Customs Duty Refund Audit Verification",
        description: "Verify pending drawback and RoSCTL scroll deposits with ICD Khodiyar customs.",
        priority: "High",
        status: "Red",
        responsibility: "Accounts & Finance",
        created_by: user._id,
        target_date: new Date("2026-08-30")
      },
      {
        project_id: project._id,
        title: "Container Detention Waiver Confirmation",
        description: "Obtain detention waiver letter from Maersk Line for Mundra import shipment.",
        priority: "Low",
        status: "Green",
        responsibility: "Documentation Desk",
        created_by: user._id,
        target_date: new Date("2026-09-02")
      },
      {
        project_id: project._id,
        title: "Port Terminal Handling Charge Reconciliation",
        description: "Reconcile terminal handling charges (THC) with Hazira port authority.",
        priority: "Medium",
        status: "Yellow",
        responsibility: "Audit Team",
        created_by: user._id,
        target_date: new Date("2026-09-05")
      }
    ];

    await OpenPointModel.insertMany(fakeOpenPoints);
    console.log(`✅ Inserted ${fakeOpenPoints.length} fake open points.`);

    // ----------------------------------------------------
    // 6. SEED FAKE FREIGHT ENQUIRIES (freight_enquiries collection)
    // ----------------------------------------------------
    const FreightModel = mongoose.model("FreightEnquiry", new mongoose.Schema({}, { strict: false }), "freight_enquiries");

    console.log(`\nClearing existing fake Freight Enquiries for company ${fakeCompanyName}...`);
    await FreightModel.deleteMany({
      $or: [
        { organization_name: fakeCompanyName },
        { consignee_name: fakeCompanyName },
        { shipper_name: fakeCompanyName }
      ]
    });

    const fakeFreightEnquiries = [
      {
        job_no: "FF/2026/001",
        enquiry_no: "ENQ-NOV-001",
        organization_name: fakeCompanyName,
        shipper_name: "ORCHID METAL SCRAP TRADING LLC",
        consignee_name: fakeCompanyName,
        origin_port: "Shuwaikh",
        destination_port: "Mundra",
        port_of_loading: "Shuwaikh, Kuwait",
        port_of_destination: "Mundra, India",
        place_of_receipt: "Shuwaikh Port Yard, Kuwait",
        shipment_type: "Import-Sea",
        status: "Converted",
        draft_bl_approved: false,
        vessel_name: "MAERSK ESSEN",
        voyage_no: "2401E",
        shipping_line_airline: "MAERSK LINE",
        no_packages: "180",
        package_unit: "BAGS",
        gross_weight: "21610",
        gross_weight_unit: "KG",
        net_weight: "21510",
        net_weight_unit: "KG",
        volume_cbm: "65.5",
        volume_unit: "CBM",
        chargeable_weight: "21610",
        chargeable_weight_unit: "KG",
        booking_no: "BK-NOV-9910",
        booking_date: "2026-07-25",
        cut_off_date: "2026-07-28",
        sailing_date: "2026-08-01",
        eta_date: "2026-08-12",
        arrival_date: "2026-08-14",
        shipment_terms: "CIF",
        freight_type: "PREPAID",
        cargo_type: "GENERAL CARGO",
        invoice_no: "INV/FF/2026/881",
        invoice_date: "2026-07-22",
        sb_no: "SB-9901823",
        sb_date: "2026-07-30",
        egm_no: "EGM-2026-551",
        egm_date: "2026-08-02",
        mbl_no: "MSK99102837",
        mbl_date: "2026-08-01",
        hbl_no: "NOVHBL202601",
        hbl_date: "2026-08-01",
        containers: [
          { container_number: "HAMU1769376", custom_seal: "CUSTOM-8812", line_seal: "HL-1092837" },
          { container_number: "HAMU1769377", custom_seal: "CUSTOM-8813", line_seal: "HL-1092838" }
        ],
        bl_details: {
          shipper: "ORCHID METAL SCRAP TRADING LLC\nP.O. BOX 9912, SHUWAIKH INDUSTRIAL AREA, KUWAIT",
          consignee: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          notify_party: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          vessel_name: "MAERSK ESSEN",
          voyage_no: "2401E",
          place_of_acceptance: "Shuwaikh Port Yard, Kuwait",
          port_of_loading: "Shuwaikh, Kuwait",
          port_of_discharge: "Mundra, India",
          place_of_delivery: "Mundra Port CFS, India",
          description_of_goods: "COPPER SCRAP BIRCH CLIFF AS PER INVOICE NO INV/ORC/88102\nPACKED IN 180 JUMBO BAGS\nHSN CODE: 74040012",
          gross_weight: "21610 KGS",
          measurement: "65.50 CBM",
          no_of_packages_words: "ONE HUNDRED EIGHTY BAGS ONLY",
          place_of_issue: "MUNDRA",
          date_of_issue: "2026-08-01",
          no_of_originals: "THREE (3)"
        }
      },
      {
        job_no: "FF/2026/002",
        enquiry_no: "ENQ-NOV-002",
        organization_name: fakeCompanyName,
        shipper_name: fakeCompanyName,
        consignee_name: "GULF METALS TRADING FZE",
        origin_port: "Mundra",
        destination_port: "Jebel Ali",
        port_of_loading: "Mundra, India",
        port_of_destination: "Jebel Ali, UAE",
        place_of_receipt: "ICD Sanand, Ahmedabad",
        shipment_type: "Export-Sea",
        status: "Converted",
        draft_bl_approved: true,
        vessel_name: "MSC EMMA",
        voyage_no: "2608W",
        shipping_line_airline: "MSC LINE",
        no_packages: "200",
        package_unit: "BAGS",
        gross_weight: "22315",
        gross_weight_unit: "KG",
        net_weight: "22200",
        net_weight_unit: "KG",
        volume_cbm: "68.0",
        volume_unit: "CBM",
        chargeable_weight: "22315",
        chargeable_weight_unit: "KG",
        booking_no: "BK-MSC-88910",
        booking_date: "2026-07-28",
        cut_off_date: "2026-08-02",
        sailing_date: "2026-08-05",
        eta_date: "2026-08-14",
        arrival_date: "2026-08-15",
        shipment_terms: "FOB",
        freight_type: "COLLECT",
        cargo_type: "GENERAL CARGO",
        invoice_no: "INV/EXP/2026/001",
        invoice_date: "2026-08-02",
        sb_no: "8890123",
        sb_date: "2026-08-04",
        egm_no: "EGM-2026-881",
        egm_date: "2026-08-06",
        mbl_no: "MSCU8891023",
        mbl_date: "2026-08-05",
        hbl_no: "NOVHBL202602",
        hbl_date: "2026-08-05",
        containers: [
          { container_number: "MSKU8765432", custom_seal: "SL998877", line_seal: "MSC-77881" },
          { container_number: "MSKU8765433", custom_seal: "SL998878", line_seal: "MSC-77882" }
        ],
        bl_details: {
          shipper: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          consignee: "GULF METALS TRADING FZE\nP.O. BOX 18293, JEBEL ALI FREE ZONE, DUBAI, UAE",
          notify_party: "GULF METALS TRADING FZE\nP.O. BOX 18293, JEBEL ALI FREE ZONE, DUBAI, UAE",
          vessel_name: "MSC EMMA",
          voyage_no: "2608W",
          place_of_acceptance: "ICD Sanand, Ahmedabad",
          port_of_loading: "Mundra, India",
          port_of_discharge: "Jebel Ali, UAE",
          place_of_delivery: "Jebel Ali Free Zone, UAE",
          description_of_goods: "STAINLESS STEEL SCRAP AS PER INVOICE INV/EXP/2026/001\nPACKED IN 200 BAGS\nHSN CODE: 72042190",
          gross_weight: "22315 KGS",
          measurement: "68.00 CBM",
          no_of_packages_words: "TWO HUNDRED BAGS ONLY",
          place_of_issue: "AHMEDABAD",
          date_of_issue: "2026-08-05",
          no_of_originals: "THREE (3)"
        }
      },
      {
        job_no: "FF/2026/003",
        enquiry_no: "ENQ-NOV-003",
        organization_name: fakeCompanyName,
        shipper_name: "PEGASUS METALLURGY S.A.",
        consignee_name: fakeCompanyName,
        origin_port: "Thessaloniki",
        destination_port: "Khodiyar",
        port_of_loading: "Thessaloniki, Greece",
        port_of_destination: "ICD Khodiyar, India",
        place_of_receipt: "Thessaloniki Port Yard, Greece",
        shipment_type: "Import-Sea",
        status: "Enquiry",
        draft_bl_approved: false,
        vessel_name: "OOCL PIRAEUS",
        voyage_no: "109W",
        shipping_line_airline: "OOCL LINE",
        no_packages: "24",
        package_unit: "PALLETS",
        gross_weight: "23300",
        gross_weight_unit: "KG",
        net_weight: "23200",
        net_weight_unit: "KG",
        volume_cbm: "42.0",
        volume_unit: "CBM",
        chargeable_weight: "23300",
        chargeable_weight_unit: "KG",
        booking_no: "BK-OOCL-7711",
        booking_date: "2026-07-20",
        cut_off_date: "2026-07-23",
        sailing_date: "2026-07-26",
        eta_date: "2026-08-10",
        arrival_date: "2026-08-12",
        shipment_terms: "CIF",
        freight_type: "PREPAID",
        cargo_type: "GENERAL CARGO",
        invoice_no: "INV/PEG/2026/991",
        invoice_date: "2026-07-15",
        sb_no: "SB-8812904",
        sb_date: "2026-07-22",
        egm_no: "EGM-2026-990",
        egm_date: "2026-07-28",
        mbl_no: "OOCL9988112",
        mbl_date: "2026-07-26",
        hbl_no: "NOVHBL202603",
        hbl_date: "2026-07-26",
        containers: [
          { container_number: "FSCU8889028", custom_seal: "OOCL-998811", line_seal: "CUSTOM-7711" }
        ],
        bl_details: {
          shipper: "PEGASUS METALLURGY S.A.\nTHESSALONIKI INDUSTRIAL ZONE, GREECE",
          consignee: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          notify_party: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          vessel_name: "OOCL PIRAEUS",
          voyage_no: "109W",
          place_of_acceptance: "Thessaloniki Port Yard, Greece",
          port_of_loading: "Thessaloniki, Greece",
          port_of_discharge: "ICD Khodiyar, India",
          place_of_delivery: "ICD Khodiyar CFS, Ahmedabad",
          description_of_goods: "ALUMINIUM INGOTS 99.7% AS PER INVOICE INV/PEG/2026/991\nPACKED IN 24 WOODEN PALLETS\nHSN CODE: 76011010",
          gross_weight: "23300 KGS",
          measurement: "42.00 CBM",
          no_of_packages_words: "TWENTY FOUR PALLETS ONLY",
          place_of_issue: "THESSALONIKI",
          date_of_issue: "2026-07-26",
          no_of_originals: "THREE (3)"
        }
      },
      {
        job_no: "FF/2026/004",
        enquiry_no: "ENQ-NOV-004",
        organization_name: fakeCompanyName,
        shipper_name: fakeCompanyName,
        consignee_name: "GERMAN TECH RECYCLING GMBH",
        origin_port: "Ahmedabad Airport",
        destination_port: "Frankfurt Airport",
        port_of_loading: "AMD Air Cargo, India",
        port_of_destination: "FRA Airport, Germany",
        place_of_receipt: "Ahmedabad Air Cargo Complex",
        shipment_type: "Export-Air",
        status: "Converted",
        draft_bl_approved: true,
        flight_no: "LH-757",
        flight_date: "2026-08-10",
        shipping_line_airline: "LUFTHANSA CARGO",
        no_packages: "50",
        package_unit: "BOXES",
        gross_weight: "4500",
        gross_weight_unit: "KG",
        net_weight: "4400",
        net_weight_unit: "KG",
        volume_cbm: "18.5",
        volume_unit: "CBM",
        chargeable_weight: "4500",
        chargeable_weight_unit: "KG",
        booking_no: "BK-LH-990182",
        booking_date: "2026-08-05",
        cut_off_date: "2026-08-08",
        sailing_date: "2026-08-10",
        eta_date: "2026-08-11",
        arrival_date: "2026-08-11",
        shipment_terms: "CIP",
        freight_type: "PREPAID",
        cargo_type: "AIR CARGO",
        invoice_no: "INV/EXP/2026/006",
        invoice_date: "2026-08-06",
        sb_no: "8895012",
        sb_date: "2026-08-08",
        egm_no: "EGM-AIR-2026-11",
        egm_date: "2026-08-11",
        mawb_no: "020-99881122",
        mawb_date: "2026-08-10",
        hawb_no: "NOVHAWB202604",
        hawb_date: "2026-08-10",
        containers: [],
        bl_details: {
          shipper: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          consignee: "GERMAN TECH RECYCLING GMBH\nFRANKFURT AIRPORT CARGO CITY SOUTH, GERMANY",
          notify_party: "GERMAN TECH RECYCLING GMBH\nFRANKFURT AIRPORT CARGO CITY SOUTH, GERMANY",
          vessel_name: "LH-757 AIRBUS A350",
          voyage_no: "FLIGHT LH757",
          place_of_acceptance: "Ahmedabad Air Cargo Complex",
          port_of_loading: "AMD Air Cargo, India",
          port_of_discharge: "FRA Airport, Germany",
          place_of_delivery: "Frankfurt Cargo Terminal, Germany",
          description_of_goods: "HIGH PURITY PRECISION COPPER COMPONENTS\nPACKED IN 50 HEAVY DUTY CARDBOARD BOXES\nHSN CODE: 74091100",
          gross_weight: "4500 KGS",
          measurement: "18.50 CBM",
          no_of_packages_words: "FIFTY BOXES ONLY",
          place_of_issue: "AHMEDABAD",
          date_of_issue: "2026-08-10",
          no_of_originals: "THREE (3)"
        }
      },
      {
        job_no: "FF/2026/005",
        enquiry_no: "ENQ-NOV-005",
        organization_name: fakeCompanyName,
        shipper_name: fakeCompanyName,
        consignee_name: "AMERICAN RECYCLING CORP",
        origin_port: "Hazira",
        destination_port: "Houston",
        port_of_loading: "Hazira, India",
        port_of_destination: "Houston, USA",
        place_of_receipt: "Hazira Port Yard, Surat",
        shipment_type: "Export-Sea",
        status: "Converted",
        draft_bl_approved: true,
        vessel_name: "HAPAG EXPRESS",
        voyage_no: "881S",
        shipping_line_airline: "HAPAG LLOYD",
        no_packages: "200",
        package_unit: "BAGS",
        gross_weight: "22315",
        gross_weight_unit: "KG",
        net_weight: "22200",
        net_weight_unit: "KG",
        volume_cbm: "67.2",
        volume_unit: "CBM",
        chargeable_weight: "22315",
        chargeable_weight_unit: "KG",
        booking_no: "BK-HL-771092",
        booking_date: "2026-08-06",
        cut_off_date: "2026-08-09",
        sailing_date: "2026-08-12",
        eta_date: "2026-08-28",
        arrival_date: "2026-08-30",
        shipment_terms: "CIF",
        freight_type: "PREPAID",
        cargo_type: "GENERAL CARGO",
        invoice_no: "INV/EXP/2026/003",
        invoice_date: "2026-08-10",
        sb_no: "8892551",
        sb_date: "2026-08-11",
        egm_no: "EGM-2026-901",
        egm_date: "2026-08-13",
        mbl_no: "HLCU88910294",
        mbl_date: "2026-08-12",
        hbl_no: "NOVHBL202605",
        hbl_date: "2026-08-12",
        containers: [
          { container_number: "HLXU4419021", custom_seal: "HL556677", line_seal: "CUSTOM-8812" }
        ],
        bl_details: {
          shipper: `${fakeCompanyName}\n101 SURAJ HOUSE, S.G. HIGHWAY, AHMEDABAD, INDIA`,
          consignee: "AMERICAN RECYCLING CORP\n100 OCEAN PARKWAY, HOUSTON, TX 77001, USA",
          notify_party: "AMERICAN RECYCLING CORP\n100 OCEAN PARKWAY, HOUSTON, TX 77001, USA",
          vessel_name: "HAPAG EXPRESS",
          voyage_no: "881S",
          place_of_acceptance: "Hazira Port Yard, Surat",
          port_of_loading: "Hazira, India",
          port_of_discharge: "Houston, USA",
          place_of_delivery: "Houston Port Terminal, USA",
          description_of_goods: "STAINLESS STEEL SCRAP 304 AS PER INVOICE INV/EXP/2026/003\nPACKED IN 200 BAGS\nHSN CODE: 72042190",
          gross_weight: "22315 KGS",
          measurement: "67.20 CBM",
          no_of_packages_words: "TWO HUNDRED BAGS ONLY",
          place_of_issue: "SURAT",
          date_of_issue: "2026-08-12",
          no_of_originals: "THREE (3)"
        }
      }
    ];

    await FreightModel.insertMany(fakeFreightEnquiries);
    console.log(`✅ Inserted ${fakeFreightEnquiries.length} fake freight enquiries.`);

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
