import axios from "axios";
import transportAuthService from "./transportAuthService.js";

class ElockApiService {
    constructor() {
        // iCloud Assets Controls API configuration
        this.icloudBaseURL = "http://icloud.assetscontrols.com:8092/OpenApi";
        this.fTokenID = null;
        this.fUserGUID = null;
        this.fTokenExpiry = null;

        // Third-party API configuration
        this.thirdPartyBaseURL = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";
    }

    /**
     * Authenticate with iCloud Assets Controls API
     * Using dummy data based on the provided response format
     */
    async authenticateICloudAPI() {
        try {
            // Mock authentication response - replace with actual authentication
            const authResponse = {
                Result: 200,
                Message: "success",
                FObject: [
                    {
                        FUserName: "alluvium",
                        FUserGUID: "307b8d35-bde9-4221-af9c-ecf13bc5bbd2",
                        FTokenID: "e36d2589-9dc3-4302-be7d-dc239af1846c",
                        FExpireTime: "2026-04-30T00:00:00",
                    },
                ],
            };

            if (
                authResponse.Result === 200 &&
                authResponse.FObject &&
                authResponse.FObject.length > 0
            ) {
                const tokenData = authResponse.FObject[0];
                this.fTokenID = tokenData.FTokenID;
                this.fUserGUID = tokenData.FUserGUID;
                this.fTokenExpiry = new Date(tokenData.FExpireTime);

                console.log("✅ iCloud Assets Controls API authentication successful");
                return {
                    tokenID: this.fTokenID,
                    userGUID: this.fUserGUID,
                };
            } else {
                throw new Error("iCloud API Authentication failed: Invalid response");
            }
        } catch (error) {
            console.error(
                "❌ iCloud Assets Controls API authentication failed:",
                error.message
            );
            throw new Error(`iCloud API Authentication failed: ${error.message}`);
        }
    }

    /**
     * Ensure we have a valid iCloud API token
     */
    async ensureValidICloudToken() {
        if (
            !this.fTokenID ||
            !this.fTokenExpiry ||
            new Date() >= this.fTokenExpiry
        ) {
            await this.authenticateICloudAPI();
        }
        return this.fTokenID;
    }

    /**
     * Helper function to safely format address
     */
    formatAddress(locationObj) {
        if (!locationObj) return "N/A";

        const parts = [];
        if (locationObj.name) parts.push(locationObj.name);
        if (locationObj.city) parts.push(locationObj.city);
        if (locationObj.district && locationObj.district !== locationObj.city)
            parts.push(locationObj.district);
        if (locationObj.state) parts.push(locationObj.state);
        if (locationObj.postal_code) parts.push(locationObj.postal_code);
        if (locationObj.country) parts.push(locationObj.country);

        return parts.length > 0 ? parts.join(", ") : "N/A";
    }

    /**
     * Helper function to format company details
     */
    formatCompanyDetails(companyObj) {
        if (!companyObj) return null;

        return {
            id: companyObj._id,
            name: companyObj.name,
            alias: companyObj.alias,
            type: companyObj.type,
            gstin: companyObj.gstin,
            panNo: companyObj.panNo,
            ieCodeNo: companyObj.ieCodeNo,
            binNo: companyObj.binNo,
            cinNo: companyObj.cinNo,
            cstNo: companyObj.cstNo,
            stNo: companyObj.stNo,
            stRegNo: companyObj.stRegNo,
            tanNo: companyObj.tanNo,
            vatNo: companyObj.vatNo,
            branches:
                companyObj.branches?.map((branch) => ({
                    id: branch._id,
                    branchName: branch.branchName,
                    address: branch.address,
                    country: branch.country,
                    state: branch.state,
                    city: branch.city,
                    postalCode: branch.postalCode,
                    telephoneNo: branch.telephoneNo,
                    fax: branch.fax,
                    website: branch.website,
                    emailAddress: branch.emailAddress,
                    taxableType: branch.taxableType,
                    addresses: branch.addresses,
                    contacts: branch.contacts,
                })) || [],
            createdAt: companyObj.createdAt,
            updatedAt: companyObj.updatedAt,
        };
    }

    /**
     * Get E-Lock assignments with complete data mapping
     * Now supports filtering by multiple IE codes
     */
    async getElockAssignments(queryParams = {}, authToken = null) {
        try {
            const {
                page = 1,
                limit = 100,
                search = "",
                status = "",
                filterType = "",
                ieCodeNo = "",
            } = queryParams;

            console.log(
                "🔍 Backend: Processing assignment request with params:",
                queryParams
            );
            console.log(`📌 Backend: IE Code to filter by: "${ieCodeNo}"`);

            // Build query parameters for third-party API
            // IMPORTANT: Fetch ALL records first, then filter and paginate locally
            const params = {
                page: 1,
                limit: 10000, // Fetch all records
            };

            // Add optional parameters only if provided
            if (status) params.status = status;
            if (filterType) params.filterType = filterType;

            // Note: We don't send ieCodeNo to third-party API as we'll filter locally
            // This allows us to handle multiple IE codes properly

            console.log("📡 Backend: Calling third-party API to fetch all records");

            const serviceToken = await transportAuthService.getServiceToken();

            // Fetch from both endpoints in parallel
            const [response, othersResponse] = await Promise.all([
                axios.get(
                    `${this.thirdPartyBaseURL}/client-elock-assign`,
                    {
                        params,
                        timeout: 15000,
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
                        },
                    }
                ),
                axios.get(
                    `${this.thirdPartyBaseURL}/elock/assign-others`,
                    {
                        params: { page: 1, limit: 10000 },
                        timeout: 15000,
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
                        },
                    }
                ).catch(err => {
                    console.warn("⚠️ Backend: Failed to fetch assign-others data:", err.message);
                    return { data: { jobs: [] } };
                })
            ]);

            console.log("✅ Backend: Third-party API response received");
            console.log(
                `📊 Backend: Total jobs from client-elock-assign: ${response.data?.jobs?.length || 0}`
            );

            const othersJobs = othersResponse.data?.jobs || [];
            console.log(
                `📊 Backend: Total jobs from assign-others: ${othersJobs.length}`
            );

            let jobs = response.data?.jobs || [];

            // Merge "others" e-lock assignments into main jobs
            // 1) Overlay e-lock info onto main records that have matching containers but no e-lock
            // 2) Add ALL "others" records as separate rows so they appear in the UI
            if (othersJobs.length > 0) {
                const othersByContainer = {};
                for (const oj of othersJobs) {
                    if (oj.container_number) {
                        if (!othersByContainer[oj.container_number]) {
                            othersByContainer[oj.container_number] = [];
                        }
                        othersByContainer[oj.container_number].push(oj);
                    }
                }

                // For existing jobs, overlay e-lock info from "others" if the main record has no e-lock
                for (let i = 0; i < jobs.length; i++) {
                    const job = jobs[i];
                    if (job.container_number && othersByContainer[job.container_number]) {
                        const othersForContainer = othersByContainer[job.container_number];
                        // Find an "others" record that has an assigned e-lock
                        const assignedOther = othersForContainer.find(
                            oj => oj.elock_assign_status === "ASSIGNED" && oj.elock_no
                        );

                        if (assignedOther && (!job.elock_no || job.elock_assign_status === "UNASSIGNED")) {
                            const elockFAssetId = typeof assignedOther.elock_no === 'object'
                                ? assignedOther.elock_no?.FAssetID
                                : assignedOther.elock_no;

                            console.log(
                                `🔗 Backend: Merging e-lock ${elockFAssetId} from assign-others into container ${job.container_number}`
                            );

                            jobs[i] = {
                                ...job,
                                elock_no: elockFAssetId || null,
                                elock_assign_status: assignedOther.elock_assign_status,
                                uploadedImageUrls: (job.uploadedImageUrls && job.uploadedImageUrls.length > 0)
                                    ? job.uploadedImageUrls
                                    : assignedOther.uploadedImageUrls || [],
                                _othersElockMerged: true,
                                _othersTrNo: assignedOther.tr_no,
                            };
                        }
                    }
                }

                // Add ALL "others" records as separate rows so they are visible in the UI
                console.log(
                    `➕ Backend: Adding all ${othersJobs.length} assign-others records as separate rows`
                );
                for (const oj of othersJobs) {
                    const elockFAssetId = typeof oj.elock_no === 'object'
                        ? oj.elock_no?.FAssetID
                        : oj.elock_no;

                    jobs.push({
                        ...oj,
                        elock_no: elockFAssetId || null,
                        _fromAssignOthers: true,
                    });
                }

                console.log(
                    `✅ Backend: After adding assign-others: ${jobs.length} total jobs`
                );
            }

            // Apply IE code filtering if provided
            if (ieCodeNo) {
                console.log(
                    `🔍 Backend: Filtering by IE Code: "${ieCodeNo}"${filterType ? ` (filterType: ${filterType})` : ""
                    }`
                );
                
                const beforeCount = jobs.length;
                jobs = jobs.filter((item) => {
                    const consignorIeCode = item.consignor?.ieCodeNo;
                    const consigneeIeCode = item.consignee?.ieCodeNo;

                    // If filterType is specified, only check that specific party
                    if (filterType === "consignor") {
                        return consignorIeCode === ieCodeNo;
                    } else if (filterType === "consignee") {
                        return consigneeIeCode === ieCodeNo;
                    } else {
                        // If no filterType, check both consignor and consignee
                        return consignorIeCode === ieCodeNo || consigneeIeCode === ieCodeNo;
                    }
                });
                console.log(
                    `✅ Backend: After IE code filtering: ${jobs.length} assignments (filtered from ${beforeCount})`
                );
            } else {
                console.log(
                    `⚠️ Backend: No IE Code filter applied - showing all records`
                );
            }

            // Apply search filtering if provided
            let filteredJobs = jobs;
            if (search) {
                const lowerSearch = search.toLowerCase();
                filteredJobs = jobs.filter(
                    (item) =>
                        (item.container_number &&
                            item.container_number.toLowerCase().includes(lowerSearch)) ||
                        (item.vehicle_no &&
                            item.vehicle_no.toLowerCase().includes(lowerSearch)) ||
                        (item.driver_name &&
                            item.driver_name.toLowerCase().includes(lowerSearch)) ||
                        (item.tr_no && item.tr_no.toLowerCase().includes(lowerSearch)) ||
                        (item.elock_no &&
                            item.elock_no.toLowerCase().includes(lowerSearch)) ||
                        (item.consignor?.name &&
                            item.consignor.name.toLowerCase().includes(lowerSearch)) ||
                        (item.consignee?.name &&
                            item.consignee.name.toLowerCase().includes(lowerSearch))
                );
                console.log(
                    `✅ Backend: After search filtering: ${filteredJobs.length} assignments`
                );
            }

            // Transform the filtered data for response
            const allTransformedData = filteredJobs.map((item) => ({
                _id: item._id,
                tr_no: item.tr_no,
                container_number: item.container_number,
                container_no: item.container_number || "N/A",
                vehicle_no: item.vehicle_no,
                driver_name: item.driver_name,
                driver_phone: item.driver_phone,
                elock_no: item.elock_no,
                f_asset_id: item.elock_no,
                elock_status: item.elock_assign_status,
                elock_assign_status: item.elock_assign_status,
                consignor: this.formatCompanyDetails(item.consignor),
                consignor_name: item.consignor?.name || "N/A",
                consignor_alias: item.consignor?.alias || "N/A",
                consignor_gstin: item.consignor?.gstin || "N/A",
                consignor_ie_code: item.consignor?.ieCodeNo || "N/A",
                consignee: this.formatCompanyDetails(item.consignee),
                consignee_name: item.consignee?.name || "N/A",
                consignee_alias: item.consignee?.alias || "N/A",
                consignee_gstin: item.consignee?.gstin || "N/A",
                consignee_ie_code: item.consignee?.ieCodeNo || "N/A",
                goods_pickup: item.goods_pickup,
                pickup_location: {
                    id: item.goods_pickup?._id,
                    name: item.goods_pickup?.name,
                    postal_code: item.goods_pickup?.postal_code,
                    city: item.goods_pickup?.city,
                    district: item.goods_pickup?.district,
                    state: item.goods_pickup?.state,
                    country: item.goods_pickup?.country,
                    createdAt: item.goods_pickup?.createdAt,
                    updatedAt: item.goods_pickup?.updatedAt,
                },
                pickup_location_address: this.formatAddress(item.goods_pickup),
                goods_delivery: item.goods_delivery,
                delivery_location: {
                    id: item.goods_delivery?._id,
                    name: item.goods_delivery?.name,
                    postal_code: item.goods_delivery?.postal_code,
                    city: item.goods_delivery?.city,
                    district: item.goods_delivery?.district,
                    state: item.goods_delivery?.state,
                    country: item.goods_delivery?.country,
                    createdAt: item.goods_delivery?.createdAt,
                    updatedAt: item.goods_delivery?.updatedAt,
                },
                delivery_location_address: this.formatAddress(item.goods_delivery),
                seal_no: item.seal_no || "N/A",
                gross_weight: item.gross_weight || "N/A",
                net_weight: item.net_weight || "N/A",
                total_weight: item.gross_weight || item.net_weight || "N/A",
                container_details: `TR: ${item.tr_no || "N/A"} | Vehicle: ${item.vehicle_no || "N/A"
                    } | Driver: ${item.driver_name || "N/A"} | Phone: ${item.driver_phone || "N/A"
                    }`,
                trip_summary: {
                    from: item.goods_pickup?.name || "Unknown",
                    to: item.goods_delivery?.name || "Unknown",
                    distance: item.distance || "N/A",
                    estimated_time: item.estimated_time || "N/A",
                },
                location: null,
                current_location: null,
                created_at: item.createdAt,
                updated_at: item.updatedAt,
                ...Object.keys(item).reduce((acc, key) => {
                    if (
                        ![
                            "_id",
                            "tr_no",
                            "container_number",
                            "vehicle_no",
                            "driver_name",
                            "driver_phone",
                            "elock_no",
                            "elock_assign_status",
                            "consignor",
                            "consignee",
                            "goods_pickup",
                            "goods_delivery",
                            "seal_no",
                            "gross_weight",
                            "net_weight",
                            "createdAt",
                            "updatedAt",
                        ].includes(key)
                    ) {
                        acc[key] = item[key];
                    }
                    return acc;
                }, {}),
            }));

            const totalFilteredCount = allTransformedData.length;

            // Apply manual pagination
            const startIndex = (parseInt(page) - 1) * parseInt(limit);
            const endIndex = startIndex + parseInt(limit);
            const paginatedData = allTransformedData.slice(startIndex, endIndex);

            console.log(
                `📄 Backend: Returning page ${page} with ${paginatedData.length} records out of ${totalFilteredCount} total`
            );

            const result = {
                success: true,
                data: paginatedData,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalCount: totalFilteredCount,
                    totalPages: Math.ceil(totalFilteredCount / parseInt(limit)),
                    currentPage: parseInt(page),
                    hasNextPage: parseInt(page) * parseInt(limit) < totalFilteredCount,
                    hasPreviousPage: parseInt(page) > 1,
                },
                filters: {
                    status,
                    filterType,
                    ieCodeNo,
                    search,
                },
                summary: {
                    totalAssignments: totalFilteredCount,
                    assignedCount: allTransformedData.filter(
                        (item) => item.elock_assign_status === "ASSIGNED"
                    ).length,
                    unassignedCount: allTransformedData.filter(
                        (item) => item.elock_assign_status === "UNASSIGNED"
                    ).length,
                    returnedCount: allTransformedData.filter(
                        (item) => item.elock_assign_status === "RETURNED"
                    ).length,
                },
                message: `Found ${totalFilteredCount} assignments${ieCodeNo ? ` for IE Code: ${ieCodeNo}` : ""
                    }`,
            };

            console.log("✅ Backend: Sending filtered and transformed response");
            return result;
        } catch (error) {
            console.error("❌ Backend: Error in getElockAssignments:", error.message);

            const errorResult = {
                success: false,
                error: error.message,
                data: [],
                pagination: {
                    page: parseInt(queryParams.page) || 1,
                    limit: parseInt(queryParams.limit) || 100,
                    totalCount: 0,
                    totalPages: 1,
                    currentPage: parseInt(queryParams.page) || 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
                filters: {
                    status: queryParams.status || "",
                    filterType: queryParams.filterType || "",
                    ieCodeNo: queryParams.ieCodeNo || "",
                    search: queryParams.search || "",
                },
                summary: {
                    totalAssignments: 0,
                    assignedCount: 0,
                    unassignedCount: 0,
                    returnedCount: 0,
                },
                message: "Failed to fetch assignments",
            };

            return errorResult;
        }
    }

    /**
     * Get detailed assignment by ID
     */
    async getAssignmentById(assignmentId, authToken = null) {
        try {
            console.log(
                "🔍 Backend: Getting assignment details for ID:",
                assignmentId
            );

            // You can implement specific endpoint for single assignment
            // For now, we'll get all and filter by ID
            const allAssignments = await this.getElockAssignments({ limit: 1000 }, authToken);

            if (allAssignments.success) {
                const assignment = allAssignments.data.find(
                    (item) => item._id === assignmentId
                );

                if (assignment) {
                    return {
                        success: true,
                        data: assignment,
                        message: "Assignment details retrieved successfully",
                    };
                } else {
                    return {
                        success: false,
                        error: "Assignment not found",
                        message: "Assignment with the specified ID was not found",
                    };
                }
            }

            return allAssignments;
        } catch (error) {
            console.error("❌ Backend: Error in getAssignmentById:", error.message);
            return {
                success: false,
                error: error.message,
                message: "Failed to get assignment details",
            };
        }
    }

    /**
     * Get asset info from iCloud Admin API
     */
    async getAssetInfo(assetId) {
        try {
            await this.ensureValidICloudToken();

            const response = await axios.post(
                `${this.icloudBaseURL}/Admin`,
                {
                    FAction: "QueryAdminAssetByAssetId",
                    FTokenID: this.fTokenID,
                    FAssetID: assetId,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log(`✅ Asset info retrieved for ${assetId}`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to get asset info for ${assetId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get track history from iCloud LBS API
     */
    async getTrackHistory(params) {
        try {
            await this.ensureValidICloudToken();

            const { guid, startTime, endTime, type = 2, assetTypeId = 3701 } = params;

            const response = await axios.post(
                `${this.icloudBaseURL}/LBS`,
                {
                    FAction: "QueryLBSTrackListByFGUID",
                    FTokenID: this.fTokenID,
                    FGUID: guid,
                    FType: type,
                    FAssetTypeID: assetTypeId,
                    FStartTime: startTime,
                    FEndTime: endTime,
                    FLanguage: 0,
                    FDateType: 1,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 20000,
                }
            );

            console.log(`✅ Track history retrieved for GUID ${guid}`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to get track history:`, error.message);
            throw error;
        }
    }

    /**
     * Get asset location using iCloud Assets Controls LBS API
     */
    async getAssetLocation(assetId, type = 2) {
        try {
            await this.ensureValidICloudToken();

            const response = await axios.post(
                `${this.icloudBaseURL}/LBS`,
                {
                    FTokenID: this.fTokenID,
                    FAction: "QueryLBSMonitorListByFGUIDs",
                    FGUIDs: assetId,
                    FType: type, 
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("✅ Successfully retrieved asset location");
            return {
                success: true,
                data: response.data,
                assetId,
            };
        } catch (error) {
            console.error("❌ Failed to get asset location:", error.message);
            return {
                success: false,
                error: error.message,
                assetId,
            };
        }
    }

    /**
     * Unlock E-Lock device using iCloud Assets Controls API
     */
    async unlockDevice(assetId) {
        try {
            await this.ensureValidICloudToken();

            // Step 1: Get asset data to retrieve FGUID
            const adminURL = `${this.icloudBaseURL}/Admin`;
            const assetResponse = await axios.post(
                adminURL,
                {
                    FAction: "QueryAdminAssetByAssetId",
                    FTokenID: this.fTokenID,
                    FAssetID: assetId,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            if (
                !assetResponse.data.FObject ||
                assetResponse.data.FObject.length === 0
            ) {
                throw new Error("Asset not found in system");
            }

            const assetData = assetResponse.data.FObject[0];

            // Step 2: Send unlock command using FGUID
            const unlockURL = `${this.icloudBaseURL}/Instruction`;
            const unlockResponse = await axios.post(
                unlockURL,
                {
                    FTokenID: this.fTokenID,
                    FAction: "OpenLockControl",
                    FAssetGUID: assetData.FGUID,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 15000,
                }
            );

            console.log("✅ Unlock command sent successfully");

            return {
                success: unlockResponse.data.Result === 200,
                response: unlockResponse.data,
                assetId,
                assetGUID: assetData.FGUID,
                message:
                    unlockResponse.data.Result === 200
                        ? "Unlock instruction sent successfully!"
                        : unlockResponse.data.Message,
            };
        } catch (error) {
            console.error("❌ Failed to unlock device:", error.message);
            return {
                success: false,
                error: error.message,
                assetId,
            };
        }
    }

    /**
     * Check service status
     */
    async checkServiceStatus() {
        try {
            await this.ensureValidICloudToken();

            return {
                success: true,
                message: "iCloud Assets Controls API service is operational",
                tokenID: this.fTokenID ? "Valid" : "Invalid",
                userGUID: this.fUserGUID || "Not set",
                thirdPartyAPI: this.thirdPartyBaseURL,
            };
        } catch (error) {
            return {
                success: false,
                message: "Service unavailable",
                error: error.message,
            };
        }
    }
}

// Create singleton instance
const elockApiService = new ElockApiService();

export default elockApiService;
