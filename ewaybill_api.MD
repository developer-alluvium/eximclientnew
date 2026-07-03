EWayBillAPIDocument-EnterpriseSolution
CompanyConfidential

## MASTERSINDIAPRIVATELIMITED

#1:AuthToken:
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/token-auth/
data-raw

## '{

## "username":"aman@mastersindia.co",

"password":"XXXXXXXX"

## }'

SuccessResponse:

## {

## "token":

"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U"

## }

FailedResponse:

## {

"error":"Unabletologinwithprovidedcredential"

## }

#2:GenerateEwaybill:
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/ewayBillsGenerate/
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxOTQyLCJ1c2VybmFtZSI6ImFtYW5AbWFzdGV
yc2luZGlhLmNvIiwiZXhwIjoxNjk0ODM2NDY4LCJlbWFpbCI6ImFtYW5AbWFzdGVyc2luZGlhLmNvIiwib3J
pZ19pYXQiOjE2OTQ3NTAwNjh9.vXwpsB0kHwaub20D7fLxOJDdA4fQFMIrAABRk-uoibk'

## --data'{

"userGstin":"24ANGPR7652E1ZV",

## "supply_type":"outward",

"sub_supply_type":"Supply",

## "sub_supply_description":"",

"document_type":"TaxInvoice",
"document_number":"IMP/23/032",

## "document_date":"22/06/2023",

"gstin_of_consignor":"24ANGPR7652E1ZV",
"legal_name_of_consignor":"Welton",

"address1_of_consignor":"TheTajMahalPalace,ApolloBandar",
"address2_of_consignor":"Colaba,Mumbai",
"place_of_consignor":"Mumbai",

## "pincode_of_consignor":400001,

"state_of_consignor":"UTTARAKHAND",
"actual_from_state_name":"MAHARASHTRA",
"gstin_of_consignee":"05AAABC0181E1ZE",
"legal_name_of_consignee":"Sthuthya",
"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"Dehradun",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",
"actual_to_state_name":"UTTARAKHAND",

## "transaction_type":3,

## "other_value":0,

## "total_invoice_value":560,

## "taxable_amount":500,

## "cgst_amount":30,

## "sgst_amount":30,

## "igst_amount":0,

## "cess_amount":0,

## "cess_nonadvol_value":0,

"transporter_id":"24ANGPR7652E1ZV",

## "transporter_name":"",

## "transporter_document_number":"",

## "transporter_document_date":"",

"transportation_mode":"Road",

## "transportation_distance":"1769",

"vehicle_number":"WXX2121",
"vehicle_type":"Regular",

## "generate_status":1,

## "data_source":"erp",

## "user_ref":"",

## "location_code":"",

"eway_bill_status":"ABC",
"auto_print":"N",

## "email":"",

"delete_record":"N",
"itemList":[

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":"1001",

## "quantity":1,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":100

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":"1001",

## "quantity":1,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":100

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":"1001",

## "quantity":1,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":100

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":"1001",

## "quantity":1,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":100

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":"1001",

## "quantity":1,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":100

## }

## ]

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":301009218802,
"ewayBillDate":"15/09/202302:36:00PM",
"validUpto":"24/09/202311:59:00PM",

## "alert":"",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65041f35112f30081f9e0b3d/"

## },

"status":"Success",

## "code":200,

"requestId":"ERP1694768948_IMP/23/032"

## }

## }

FailedResponse:

## {

## "results":{

"message":"437:InvalidSuppliershipfromStateCodeforthegivenpincode.",
"status":"NoContent",

## "code":204,

## "nic_code":"437"

## }

## }

E-wayBillParameterDetails:
ParameterNameType(size)DescriptionValuesSampleData

## Allowed

character

## Mandatory

## Fields

userGstinText(15)
GSTINofAPI

## User

## 29ACGPI2251K1Z

## J

## Alphanum

## Y

supply_typeText(7)

## Supply

whetheritis
outward/inwar
d.

## O

## Y

sub_supply_typeText(30)

## Subtypesof

## Supply2

## Y

document_typeText(30)

## Document

## Type

## CHL

## Y

document_numberText(50)DocumentNo12

## Alphanum,-,

## /

## Y

document_dateText

## Document

## Date

dd/mm/yyy
yformat12/09/2017

## Y

gstin_of_consignorText(15)
GSTINofthe

## Consignor

## 29AAAAA0300L1

## Z8

## Alphanum

## Y

legal_name_of_consignorText(100)
LegalNameof
consignor

## ABHYUDHYACO

## OPBANK

## Alphanumer

ic

## N

address1_of_consignorText(120)

## Addressof

consignor-

## Line1

## Shambhai

## Fortune

## Alphanumer

ic

## N

address2_of_consignorText(120)

## Addressof

consignor-

## Line2

BehindKSRTC
BusStop

## Alphanumer

ic

## N

place_of_consignorText(50)

## Placeof

consignorBengaluruAlphabetic

## N

pincode_of_consignorNumber(6)

## Pincodeof

consignor
576101Number

## Y

state_of_consignorText(30)

## Stateof

consignor29

## Y

gstin_of_consigneeText(15)
GSTINof
consignee

## 29ACGPI2251K1Z

## J

## Alphanumer

ic

## Y

legal_name_of_consigneeText(100)

## Legalnameof

consigneeINDERCHHAJER

## Alphanumer

ic

## N

address1_of_consigneeText(120)

## Addressof

consignee-

## Line1

## PRIYADARSHANI

## LAYOUT

## Alphanumer

ic

## N

address2_of_consigneeText(120)

## Addressof

consignee-Line

## 2

## MUDALAYAPALY

## A

## Alphanumer

ic

## N

place_of_consigneeText(50)

## Placeof

consigneeBengaluruAlphabetic

## Y

pincode_of_consigneeNumber(6)

## Pincodeofthe

consignee560072Number

## Y

state_of_supplyText(30)StateofSupply4Y
taxable_amount

## Decimal(18,

## 2)

TotalAmount/

## Taxable

## Amount2000

## Y

cgst_amount

## Decimal(18,

2)CGSTAmount0

## N

sgst_amount

## Decimal(18,

## 2)

SGSTAmount0

## N

igst_amount

## Decimal(18,

2)IGSTAmount240

## N

cess_amount

## Decimal(18,

## 2)

CESSAmount20

## N

transportation_modeText(10)

## Modeof

transportation

## 1

## Y

vehicle_typeText(30)TypeofVehcileRN
transportation_distanceNumber(5)

## Distanceof

transportation

## 10

MaxValue=

## 4000

## Y

transporter_idText(15)TransporterId

## 29BQSPA3829E1

## Z0

## Y

transporter_nameText(100)

## Transporter

NameTAPURI

## N

transporter_document_num
ber

## Text(15)

## Transporter

DocNo

## 11

## N

transporter_document_dateText

## Transporter

DocDate
dd/mm/yyy
yformat13/09/2017

## N

vehicle_numberText(10)VehicleNo.KA12BL4567
VehicleNo.
tobegin
withstate
codeas
giveninthe

## Codelist

## Y

product_nameText(100)

## Nameofthe

ProductSteel

## Y

product_description

## Descriptionof

theProduct5mmRod

## N

hsn_codeNumber(8)
HSNCodeof
theProduct

## 10101

## Y

quantityDecimal(8,2)

## Quantityof

## Productin

## Numbers

## QTS

## Y

unit_of_productText(3)

## Unitofthe

## Product,like

Liter,Kgetc

## 200

## Y

taxable_amount

## Decimal(18,

## 2)

TotalAmount/

## Taxable

## Amount100000

## Y

cgst_rateDecimal(6,3)CGSTRate9Y
sgst_rateDecimal(6,3)SGSTRate9Y
igst_rateDecimal(6,3)IGSTRate18Y
cess_rateDecimal(6,3)CESSRate0N
ewayBillNoNumber(12)
UniqueE-Way
BillNo
ewayBillDateText(22)
DateandTime
ofE-WayBill

## Generation

dd/mm/yyy
yhh:mm:ss

## AM/PM

EWBSupplytypeDetails:

## Validations:

GenerationofEWayBillusingtheEWayBillAPISystemwillbeblockedforthefollowing
scenarioswheretheSupplierisenabledforEInvoice.SuchEWayBillsneedtobegenerated
eitheralongwiththeIRNgenerationorwithreferencetotheIRNusingEInvoiceSystemonly/>
•B2BandExporttransactionswheredocumentdateisequaltoorgreaterthan01/10/2020
•Documenttype-TaxInvoice

## 

IftheotherpartyGSTINiscancelled,generationofEWayBillisallowedifthedocumentdateis
withintheperiodduringwhichtheGSTINwasactive
Ifthedistanceispassedas‘0’(Zero)andthedistancebetweenthePINcodesprovidedis
availableinEWayBilldatabase,thesystemwillreplacethedistanceasperthedatabase.
Passing‘0’isanindicationthattheuserwantsthesystemtotakethedistanceaspertheEWay

## Billdatabase

## 

## Ifthedistanceispassedandisdifferingbymorethan±10%ofthepintopindistancestoredin

system,theresponsewillhavecorrespondingerrorcode

## 

## Ifthedistanceispassedandtheactualdistanceindatabaseislessthat100kms,thedistance

passedhastobelessthandistanceindatabaseplus10%ofthedistance.(Ex.Ifthedistanceis60
kms,distanceupto66kmsisallowed)

## 

Ifthedistancebetweenthetwopin-codesprovidedisnotavailableinEWayBilldatabase,E-
waybillwillbegeneratedwithanalertmessageas"ThedistancebetweenthegivenPINcodes
arenotavailableinthesystem."andit’saresponsibilityofthegeneratortoprovidecorrect
distanceinsuchcases.

## 

IffromPincodeandtoPincodearesamethen,maximumdistanceallowedis100kms.Ifthe
supplytypeis‘LineSales’,itcanbeupto300kms
Theactualdistancefromsourcetodestinationcannotbegreaterthan4000.

## 

PINCodesarevalidatedagainsttheStatetheybelongto,actFromStateCode-fromPincodeand
actToStateCode-toPincod
IfthePINCodedoesnotexistinthemasterdatabaseoftheEWayBillSystemandthefirst3
digitsofthePINcodematcheswiththerespectiveStateasperthepatternofPINcode-to-State
mappingpatterndefinedbypostaldepartment,thenEWayBillgetsgenerated
For‘OtherCountry’,Statecodeas96aswellas99areacceptedbutsystemstoresthestatecode
as99

## 

GenerationofduplicateE-waybillsforthesamedocumentbyConsigneeandTransporterisnot
allowedhenceforth,hencenowonwardsneitherConsignornorConsigneenorTransportercan
generateduplicateE-waybillsforthesamedocument.
ForSKD/CKD/Lotsmovementinmultiplevehicles,youhavetogenerateadeliverychallanfor
eachofthevehiclecontainingtheitemsbeingmovedintherespectivevehicles,thelastvehicle
shouldcarrytheoriginalinvoice.

Regenerationofe-waybillispossibleforthecancellede-waybillaswellasfortheE-waybill
havingstatus"DIS".
ForOutward,ifBillToGSTIN(toGstin)belongstoSEZ,BillTostate(toState)shouldbeOther
Countryandshiptostatecode(actTostatecode)shouldbetheactualstatecode.

## 

SimilarlyforInward,ifBillFromGSTIN(fromGstin)belongstoSEZ,BillFromstate(fromState)
shouldbeOtherCountryandDispatchfromstatecode(actFromstatecode)shouldbetheactual
statecode.

## 

Taxratesarebeingvalidated.Onlytheallowedtaxrateswillbeaccepted.

## 

Documenttypeisvalidatedagainstthesupplyandsubsupplytype.Accordingly,thetypeof
ConsignerandConsigneeisallowed.
Thesystemchecksfortheduplicatee-waybillonthesamedocumentnumberoftheconsignor.

## Ifalreadyonee-waybillexistswithsamedocumentnumber,thesystemwillnotallow

generatingonemoree-waybillonthesamenumber.Thatis,iftheconsignoristryingto
generatemultiplee-waybillsbasedononedocumentnumber,thesystemthrowserror.Evenif
theconsigneeortransportertriestogenerateanEWayBillforthesamedocumentnumber,
systemwillnotallowgenerationofEWayBillasconsignerhimselfhasusedthedocument
numberforgenerationofEWayBill.
However,ifconsigneeortransportertriestogeneratethemultiplee-waybillsonthesame
documentnumberoftheconsignor,providedtheconsignerhasnotusedthedocumentnumber
alreadytogenerateEWayBill,thesystemwillgenerateEWayBillandalertthroughAPItothe
consigneeortransporterthatalreadythereisonee-waybillwiththatdocumentnumber.
Toidentifythetypeofmovementofgoods,typeoftransactionisbeingcaptured.
AdditionalfieldsforcessNonAdvolValueandotherValuehavebeenintroducedtoenterCESS
NonAdvolamountandanyothercharges(+/-)writtenininvoice.
SumoftotalValue,cgstValue,sgstValue,igstValue,cessValue,otherValueand
cessNonAdvolValueshouldbeequaltoorlessthantotInvValuewithagracevalueofRs.2.00.

## 

WehaveaddedanewStatusDISforsuchEWaybillsthathavebeengeneratedwithonlyPartA
andPartBisnotupdatedevenafter15daysofgenerationofthistemporarynumber.
PassingtransporterIdismandatoryforgeneratingPartASlipandtransDocNo,transModeand
vehicleNoshouldbeblank.

## 

AlertingthegeneratoroftheE-WayBillthroughSMSmessage,incasethetotalinvoicevalueis
morethanRs.10Crores.
GSTR1fields(cgstValue,sgstValue,igstValue,cessValue,totalValue,otherValueandtotInvValue
inmainobjectandcgstRate,sgstRate,igstRate,cessRate,cessNonAdvol,taxableAmount)are
mandatoryaspertheintrastateorinterstatetransaction.
Maximumnumberofitemsineachinvoiceshouldnotexceedmorethan250items.
Incaseoftaxpayergeneratingassupplier,theGSTINoftherequestingtaxpayershouldbe
fromGstin

## 

Incaseoftaxpayergeneratingasrecipient,theGSTINoftherequestingtaxpayershouldbe-
toGstin

## 

Incaseoftransporter(enrolledtransporter/GSTINupdatedastransporterine-waybillportal)
generatinge-waybill,theGSTIN/TRANSINoftherequestingpersonshouldbe-transporterId
Enrolledtransporter(TRANSIN)cannotbesupplier(-fromGstin)orbuyer(-toGstin)
Thefollowingfieldsshouldhavetheoneofthevaluesgiveninthemastercodes
1.SupplyType2.SubSupplyType3.DocumentType4.TransportationMode5.Unit
QuantityCode
TheDocumentDateshouldbelessthanorequaltocurrentdate

## 

TheTransportdocumentDateshouldbegreaterthanequaltodocumentdate
-fromGstinand-toGstinshouldbevalidGSTINnumberofthesupplierandrecipient.Incaseof
unregisteredpersoninvolvedinthetransaction,passURPinthesefields.
Incaseof‘Billto–shipto’transaction,-toGstin,-toTrdNameand-toStateCodeshouldbe
passedwith‘BillTo’partyand-toAddr1,-toAddr2,-toPlace,-toPincodeand-actToStateCode
valuesshouldbepassedwith‘ShipTo’party.
Incaseof‘BillFrom–DispatchFrom’transaction,-fromGstin,-fromTrdNameand-
fromStateCodeshouldbepassedwith‘BillFrom’partyand-fromAddr1,-fromAddr2,-

fromPlace,-fromPincodeand-actFromStateCodevaluesshouldbepassedwith‘Dispatchfrom’
party.
e-WayBillcannotbegeneratedwithonlySACcodes(99)forServices,minimumoneHSNcode
belongingtoGoodsismandatory.blinkingNew

## 

HSNCodeshouldbevalidaspertheGSTmaster
Incaseofintra-statetransaction,whereboth-fromGstinand-toGstinbelongtosame
state(fromStateCodeandtoStateCodeshouldbesame),theSGSTandCGSTtaxrateandvalue
hastobepassed

## 

Incaseofinter-statetransaction,whereboth-fromGstinand-toGstinbelongtodifferent
states(fromStateCodeandtoStateCodeshouldbedifferent),theIGSTtaxrateandvaluehasto
bepassed

## 

IncaseofoneofthepartyisSEZunit,thenIGSTtaxrateandvaluehastobepassed

## 

## Incaseofroadisatransportationmode,thevehiclenumbershouldbepassedandtransport

documentnumberisoptional

## 

## Incaseofrail,airorshipisatransportationmode,thetransportdocumentnumberismust

Ifthetransportationisdonethroughthetransporter,trans_idfieldshouldhavevalidTRANSIDor

## GSTIN

Incaseofroadtransportation,ifthevehicleis‘overdimensioncargo’,passO,otherwiseR

## (regular).

## 

VehicletypeODCisprovisionedfortransportmode'Ship'blinkingNew
IfModetransportationisselectedhasship,thevehicletypecanbeODCandVehicleNumberhas
tobeprovidedblinkingNew
UQCCodewhileInitializingmulti-vehiclemovementUQCvalueisnotvalidatingagainsttheUQC
providedwhilegeneratingEwaybillblinkingNew
Ifvehiclenumberispassed,theformatofthevehicleshouldbevalidandaspertheformat
Fortemporaryregisteredvehicles,theregistrationnumberformatshouldbe‘TMXXXXXX’

## 

Incaseofsubsupplytypeisothers,thenpassthe-subSupplyDescaccordingly.
Incaseofimportorexport,theactualdistancebeingtravelledinthecountryhastobepassed.
#3:CancelEwaybill:
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/ewayBillCancel/
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'

## --data'{

"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":301009218802,

"reason_of_cancel":"Others",
"cancel_remark":"Cancelledtheorder",

## "data_source":"erp"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":"301009218802",
"cancelDate":"15/09/202302:40:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"312:Thisewaybilliseithernotgeneratedbyyouorcancelled",
"status":"NoContent",

## "code":204,

## "nic_code":"312"

## }

## }

## Validations:

E-waybillcanbecancelledbythegeneratorofthee-waybillonly.

## 

## E-waybillcanbecancelledwithin24hoursofgenerationofe-waybill

#4:EWBpartBupdate-Updatevehiclenumber
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/updateVehicleNumber/
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'

## --data'{

"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":321009218808,

"vehicle_number":"JJK8977",

## "vehicle_type":"r",

"place_of_consignor":"Noida",
"state_of_consignor":"UttarPradesh",

## "reason_code_for_vehicle_updation":"duetobreakdown",

## "reason_for_vehicle_updation":"",

## "transporter_document_number":"14456",

## "transporter_document_date":"25/06/2023",

## "mode_of_transport":1,

## "data_source":""

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"vehUpdDate":"15/09/202302:45:00PM",
"validUpto":"24/09/202311:59:00PM",

## "error":false,

"url":"https://sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65042126bc6d8306741fdcf8/"

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"362:Transporterdocumentdatecannotbeearlierthantheinvoicedate",
"status":"NoContent",

## "code":204,

## "nic_code":"362"

## }

## }

## Validations:

Part-Bcanbeupdatedbythegeneratorofthee-waybill,ifthereisnotransporter,orbythe
assignedtransporter.
Part-Bcanbeupdatedonlyifthee-waybillisactive,thatis,notcancelled.
Part-Bcanbeupdatedonlyifthee-waybilliswithinvalidityperiod,thatis,validityisnotexpired.
Ifvehicleispassed,theformatofthevehiclenumbershouldbevalidandaspertheformat.

## 

## Incaseofroadasatransportationmode,thevehiclenumbershouldbepassedandtransport

documentnumberisoptional.
Incaseofrail,airorshipasatransportationmode,thetransportdocumentnumberismust.
#5:ExtendValidityofE-WayBill
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/ewayBillValidityExtend/
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxOTQyLCJ1c2VybmFtZSI6ImFtYW5AbWFzdGV
yc2luZGlhLmNvIiwiZXhwIjoxNjk0ODc5ODIxLCJlbWFpbCI6ImFtYW5AbWFzdGVyc2luZGlhLmNvIiwib3JpZ
19pYXQiOjE2OTQ3OTM0MjF9.jsppPv_pj1IgT3REeO85yD7QZhjhHxHv-hHJotOjrY0'

## --data'{

"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":311003430463,

"vehicle_number":"KA12TR1234",
"place_of_consignor":"Dehradun",
"state_of_consignor":"UTTARAKHAND",

## "remaining_distance":10,

## "transporter_document_number":"123",

## "transporter_document_date":"25/06/2023",

## "mode_of_transport":"5",

"extend_validity_reason":"NaturalCalamity",
"extend_remarks":"Flood",
"consignment_status":"T",

## "from_pincode":248001,

"transit_type":"W",
"address_line1":"HUBLI",
"address_line2":"HUBLI",
"address_line3":"HUBLI"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":"331009219156",
"updatedDate":"20/09/202307:07:00PM",
"validUpto":"21/09/202311:59:00PM",

## "error":false,

"url":"https://sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 650af67d1b6b83a4653b2870/"

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"301:Invalidewaybillnumber",
"status":"NoContent",

## "code":204,

## "nic_code":"301"

## }

## }

## Validations

TodistinguishbetweenthegoodseitheronRoadorintransit,newparametertransitType(R-
Road,W-Warehouse,O-Others)areintroducedforExtendE-waybillAPI.

## 

Iftransmodeis1to4thenconsignmentStatusvalueshouldbeMandtransitTypeshouldbe
blank("transitType":"").
Iftransmodeis5thenconsignmentStatusvalueshouldbeTandtransitTypevaluecanbeeither
RorWorO.

## 

TheValidityofEWBcanbeextendedonlybythecurrenttransporter.Iftransporterisnot
assigned,thenthegeneratorcanupdate.
ThevalidityofEWBcanbeextendedbetween8hoursbeforeexpirytimeand8hoursafter
expirytime.
Thereasoncodealongwithreasondescriptionfortheextensionhastobeentered.
Thepresentlocationoftheconsignment,atthetimeofrequestingfortheextension,hastobe
enteredanddistancetotravelfromtheretodestinationhastobeentered.

## 

## Ifvehiclenumberispassed,theformatofthevehiclenumbershouldbevalidandasperthe

format

Incaseofroadasatransportationmode,thevehiclenumbershouldbepassedandtransport
documentnumberisoptional.
Incaseofrail,airorshipasatransportationmode,thetransportdocumentnumberismust.
Remainingdistanceshouldnotbemorethantheactualdistancementionedduringthe
generationofE-waybill.
#6:UpdateTransporterID
Method:POST
URL:https://sandb-api.mastersindia.co/api/v1/transporterIdUpdate/
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'

## --data'{

"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":321009218808,

"transporter_id":"05AAAAU6537D1ZO",
"transporter_name":"MSUttarayan"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":"321009218808",
"transporterId":"05AAAAU6537D1ZO",
"transUpdateDate":"15/09/202303:05:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"222:InvalidTransporterId",
"status":"NoContent",

## "code":204,

## "nic_code":"222"

## }

## }

#7:GETEWBDetails:
Method:GET

URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBill&gstin=24ANGPR7652E1ZV&eway_b
ill_number=321009218808
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

## "eway_bill_number":321009218808,

"eway_bill_date":"15/09/202302:44:00PM",
"generate_mode":"API",
"userGstin":"24ANGPR7652E1ZV",
"supply_type":"OUTWARD",
"sub_supply_type":"Supply",
"document_type":"TaxInvoice",
"document_number":"IMP/23/035",

## "document_date":"22/06/2023",

"gstin_of_consignor":"24ANGPR7652E1ZV",
"legal_name_of_consignor":"Welton",
"address1_of_consignor":"TheTajMahalPalace,ApolloBandar",
"address2_of_consignor":"Colaba,Mumbai",
"place_of_consignor":"Mumbai",

## "pincode_of_consignor":400001,

"state_of_consignor":"UTTARAKHAND",
"gstin_of_consignee":"05AAABC0181E1ZE",
"legal_name_of_consignee":"Sthuthya",
"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"Dehradun",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",

## "taxable_amount":500,

## "total_invoice_value":560,

## "cgst_amount":30,

## "sgst_amount":30,

## "igst_amount":0,

## "cess_amount":0,

"transporter_id":"05AAAAU6537D1ZO",
"transporter_name":"M/SUTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"eway_bill_status":"Active",

## "transportation_distance":1769,

## "number_of_valid_days":9,

"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N",

## "vehicle_type":"regular",

"actual_from_state_name":"MAHARASHTRA",
"actual_to_state_name":"UTTARAKHAND",
"transaction_type":"Bill/DispatchFrom",

## "other_value":0,

## "cess_nonadvol_value":0,

"itemList":[

## {

## "item_number":1,

## "product_id":0,

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":5,

"unit_of_product":"BOX",

## "cgst_rate":6,

## "sgst_rate":6,

## "igst_rate":0,

## "cess_rate":0,

"cessNonAdvol":0,

## "taxable_amount":500

## }

## ],

"VehiclListDetails":[

## {

"update_mode":"API",
"vehicle_number":"UQC1234",
"place_of_consignor":"Dehradun",
"state_of_consignor":"UTTARAKHAND",
"tripshtNo":0,
"userGstin":"24ANGPR7652E1ZV",
"vehicle_number_update_date":"15/09/202305:25:00PM",
"transportation_mode":"Road",
"transporter_document_number":"NEWTDN0011234",

## "transporter_document_date":null,

## "group_number":"1"

## },

## {

"update_mode":"API",
"vehicle_number":"HHJ9089",
"place_of_consignor":"Dehradun",
"state_of_consignor":"UTTARAKHAND",
"tripshtNo":0,
"userGstin":"24ANGPR7652E1ZV",
"vehicle_number_update_date":"15/09/202303:50:00PM",
"transportation_mode":"Road",

## "transporter_document_number":"908899",

## "transporter_document_date":"25/06/2023",

## "group_number":"1"

## },

## {

"update_mode":"API",
"vehicle_number":"JJK8977",
"place_of_consignor":"Noida",
"state_of_consignor":"UTTARPRADESH",
"tripshtNo":0,
"userGstin":"24ANGPR7652E1ZV",
"vehicle_number_update_date":"15/09/202302:46:00PM",
"transportation_mode":"Road",

## "transporter_document_number":"14456",

## "transporter_document_date":"25/06/2023",

## "group_number":"0"

## },

## {

"update_mode":"API",
"vehicle_number":"JJK8977",
"place_of_consignor":"Noida",
"state_of_consignor":"UTTARPRADESH",
"tripshtNo":0,
"userGstin":"24ANGPR7652E1ZV",
"vehicle_number_update_date":"15/09/202302:45:00PM",
"transportation_mode":"Road",

## "transporter_document_number":"14456",

## "transporter_document_date":"25/06/2023",

## "group_number":"0"

## },

## {

"update_mode":"API",
"vehicle_number":"WXX2121",
"place_of_consignor":"Mumbai",
"state_of_consignor":"MAHARASHTRA",
"tripshtNo":0,
"userGstin":"24ANGPR7652E1ZV",
"vehicle_number_update_date":"15/09/202302:44:00PM",
"transportation_mode":"Road",

## "transporter_document_number":"",

## "transporter_document_date":null,

## "group_number":"0"

## }

## ]

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"357:Couldnotretrieveewaybilldetails,pl.contacthelpdesk",
"status":"NoContent",

## "code":204,

## "nic_code":"357"

## }

## }

## Validations:

## 

## E-waybillnumbershouldbe12digitandvalid.

RequestorGSTINhastobesupplierGSTINorrecipientGSTINortransporterGSTIN/TRANSINin
thate-waybill.

## 

GetEWayBillResponsewillhaveadditionalparametertransactionTypeindicatingthe

## Transactiontype.

#8:RejectE-WayBill

Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/ewayBillReject/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":371009218816,

## "data_source":""

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":"371009218816",
"ewbRejectedDate":"15/09/202303:24:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"344:Invalidewaybillnumber",
"status":"NoContent",

## "code":204,

## "nic_code":"344"

## }

## }

#9:GenerateConsolidateEWayBill
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/consolidatedEwayBillsGenerate/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",
"place_of_consignor":"RAJPURA",
"state_of_consignor":"PUNJAB",
"vehicle_number":"JJK8977",

## "mode_of_transport":2,

## "transporter_document_number":14456,

## "transporter_document_date":"15/09/2023",

## "data_source":"erp",

## "list_of_eway_bills":[

## {

## "eway_bill_number":"381009218819"

## },

## {

## "eway_bill_number":"371009218816"

## }

## ]

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"cEwbNo":"3210007391",
"cEwbDate":"15/09/202303:32:00PM",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/consolidatePrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65042c58112f30081f9e0b43"

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"224:InvalidTransactionDate",
"status":"NoContent",

## "code":204,

## "nic_code":"224"

## }

## }

#9A:RegenerateConsolidateEWayBill
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/consolidatedEwayBillsRegenerate/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",

## "consolidated_eway_bill_number":3210007391,

"place_of_consignor":"Noida",
"state_of_consignor":"UttarPradesh",
"vehicle_number":"JJK8977",

## "mode_of_transport":2,

## "transporter_document_number":14456,

## "transporter_document_date":"15/09/2023",

"reason_of_cancel":"DataEntryMistake",
"reason_for_updation":"WrongEntry"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"tripSheetNo":3910007392,
"tripSheetEwayBills":[

## {

"ewbNo":381009218819

## },

## {

"ewbNo":371009218816

## }

## ],

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"224:InvalidTransactionDate",
"status":"NoContent",

## "code":204,

## "nic_code":"224"

## }

## }

#10:MultiVehicle-InitiateMultiVehicle
Method:POST
URL:'https://sandb-api.mastersindia.co/api/v1/multiVehicleMovement/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":321009218808,

## "reason_code_for_vehicle_updation":"duetobreakdown",

## "reason_for_vehicle_updation":"",

"place_of_consignor":"Dehradun",
"state_of_consignor":"UTTARAKHAND",

"place_of_consignee":"BemlNagar",
"state_of_consignee":"KARNATAKA",

## "mode_of_transport":1,

## "total_quantity":60,

"unit_code":"NOS",

## "data_source":"erp"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewbNo":"321009218808",
"groupNo":"1",
"createdDate":"15/09/202303:48:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"220:InvalidTransmode",
"status":"NoContent",

## "code":204,

## "nic_code":"220"

## }

## }

#10A:MultiVehicle-AddMultiVehicles
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/addvehiclesDetailsforMultiVehicle/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":321009218808,

## "group_number":"1",

"vehicle_number":"HHJ9089",

## "transporter_document_number":"908899",

## "transporter_document_date":"25/06/2023",

## "quantity":5.25,

## "data_source":"erp"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewbNo":"321009218808",
"groupNo":"1",
"vehAddedDate":"15/09/202303:50:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"224:InvalidTransactionDate",
"status":"NoContent",

## "code":204,

## "nic_code":"224"

## }

## }

#10B-MultiVehicle-ChangeMultiVehicles
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/changeVehiclesDetailsforMultiVehicle/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"userGstin":"24ANGPR7652E1ZV",

## "eway_bill_number":321009218808,

## "group_number":1,

"old_vehicle_number":"HHJ9089",
"new_vehicle_number":"UQC1234",

## "old_transporter_document_number":"908899",

"new_transporter_document_number":"NEWTDN0011234",
"place_of_consignor":"Dehradun",
"state_of_consignor":"UTTARAKHAND",

## "reason_code_for_vehicle_updation":"duetobreakdown",

## "reason_for_vehicle_updation":"",

## "data_source":"erp"

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"ewbNo":"321009218808",
"groupNo":"1",
"vehUpdDate":"15/09/202305:25:00PM",

## "error":false

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"406:Groupnumbercannotbeemptyorzero.",
"status":"NoContent",

## "code":204,

## "nic_code":"406"

## }

## }

#11:GetOtherPartyEWB
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsofOtherParty&gstin=05AAABB0639
G1Z8&generated_date=15/09/2023'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTUxMDM0MzgsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcml
nX2lhdCI6MTY5NTAxNzAzOH0.yMk5GOydcJ3xA5z8zQ9HvNGEw7rx7oF7tVeC-j6Qg3E'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":301009218790,

"eway_bill_date":"15/09/202301:55:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/2",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":301009218857,

"eway_bill_date":"15/09/202305:48:00PM",
"generate_mode":"API",
"userGstin":"05AAABC0181E1ZE",

## "document_number":"4239000005",

## "document_date":"15/09/2023",

"gstin_of_consignor":"05AAABC0181E1ZE",
"legal_name_of_consignor":"KasuyaGPPAutoProducts",
"gstin_of_consignee":"24ANGPR7652E1ZV",
"legal_name_of_consignee":"SHIVATECHNIQUESSURFACESPVT.LTD.",

## "total_invoice_value":0,

## "hsn_code":84099990,

"hsn_description":"LOMB.2CYL107604508600A/FODGRINDF",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":311009218805,

"eway_bill_date":"15/09/202302:39:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/4",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":321009218770,

"eway_bill_date":"15/09/202312:38:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801032",

## "document_date":"02/11/2022",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":118,

## "hsn_code":1001,

"hsn_description":"Wheat",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":331009218773,

"eway_bill_date":"15/09/202312:46:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801034",

## "document_date":"02/11/2022",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":118,

## "hsn_code":1001,

"hsn_description":"Wheat",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":331009218814,

"eway_bill_date":"15/09/202303:08:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/7",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":331009218830,

"eway_bill_date":"15/09/202304:00:00PM",
"generate_mode":"API",
"userGstin":"05AAABC0181E1ZE",

## "document_number":"salec4",

## "document_date":"14/09/2023",

"gstin_of_consignor":"05AAABC0181E1ZE",
"legal_name_of_consignor":"M/SUTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"jio",

## "total_invoice_value":1315,

## "hsn_code":1001,

## "hsn_description":"",

"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":341009218789,

"eway_bill_date":"15/09/202301:52:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/1",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":341009218804,

"eway_bill_date":"15/09/202302:38:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/3",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":351009218836,

"eway_bill_date":"15/09/202304:13:00PM",
"generate_mode":"API",
"userGstin":"05AAABC0181E1ZE",
"document_number":"NE17092397000029",

## "document_date":"15/09/2023",

"gstin_of_consignor":"05AAABC0181E1ZE",
"legal_name_of_consignor":"AmbujaCementsLimited",
"gstin_of_consignee":"24ANGPR7652E1ZV",
"legal_name_of_consignee":"BHARTIYACEMENTTRADERS",

## "total_invoice_value":121800,

## "hsn_code":25232930,

"hsn_description":"AMB.CEM.PPCYELLOWBAGS50KGSEAV",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":361009218772,

"eway_bill_date":"15/09/202312:45:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801033",

## "document_date":"02/11/2022",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":118,

## "hsn_code":1001,

"hsn_description":"Wheat",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":361009218813,

"eway_bill_date":"15/09/202302:59:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/6",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"Y"

## },

## {

## "eway_bill_number":371009218816,

"eway_bill_date":"15/09/202303:10:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",
"document_number":"T1ffr56t7931",

## "document_date":"04/05/2023",

"gstin_of_consignor":"05AAAAU6537D1ZO",
"legal_name_of_consignor":"LPG",
"gstin_of_consignee":"24ANGPR7652E1ZV",
"legal_name_of_consignee":"IsPvt.Ltd.",

## "total_invoice_value":118.9,

## "hsn_code":9112,

"hsn_description":"SpongeIron-Fines",
"eway_bill_status":"Active",
"reject_status":"Y"

## },

## {

## "eway_bill_number":381009218819,

"eway_bill_date":"15/09/202303:18:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/8",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"N"

## },

## {

## "eway_bill_number":391009218812,

"eway_bill_date":"15/09/202302:58:00PM",
"generate_mode":"API",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/5",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702.01,

## "hsn_code":84314930,

"hsn_description":"PIN/WB/HLINK851",
"eway_bill_status":"Active",
"reject_status":"Y"

## },

## {

## "eway_bill_number":391009218841,

"eway_bill_date":"15/09/202304:41:00PM",
"generate_mode":"API",
"userGstin":"05AAABC0181E1ZE",

## "document_number":"4239000004",

## "document_date":"15/09/2023",

"gstin_of_consignor":"05AAABC0181E1ZE",
"legal_name_of_consignor":"KasuyaGPPAutoProducts",
"gstin_of_consignee":"24ANGPR7652E1ZV",
"legal_name_of_consignee":"P1002",

## "total_invoice_value":0,

## "hsn_code":84099990,

"hsn_description":"SAMEROCKERSHAFT",
"eway_bill_status":"Active",
"reject_status":"N"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"366:Youwillnotgettheewaybillsgeneratedtoday,howerveryoucannaccessthe
ewaybillsofyesterdays",
"status":"NoContent",

## "code":204,

## "nic_code":"366"

## }

## }

#12:GetConsolidatedEWB
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetTripSheet&gstin=24ANGPR7652E1ZV&consol
idated_eway_bill_number=3210007391'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

## "trip_sheet_number":3210007391,

## "from_place":"rajpura",

"state_of_consignor":"PUNJAB",
"vehicle_number":"JJK8977",
"transportation_mode":"Rail",

## "transporter_document_number":"14456",

## "transporter_document_date":"15/09/2023",

"userGstin":"24ANGPR7652E1ZV",
"entered_date":"15/09/202303:32:00PM",
"tripSheetEwbBills":[

## {

## "eway_bill_number":381009218819,

"eway_bill_date":"15/09/202303:18:00PM",
"userGstin":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/8",

## "document_date":"10/05/2018",

"gstin_of_consignor":"05AAAAU6537D1ZO",

## "legal_name_of_consignor":"welton",

"gstin_of_consignee":"24ANGPR7652E1ZV",

## "legal_name_of_consignee":"sthuthya",

## "total_invoice_value":16702,

"eway_bill_valid_date":"16/09/202311:59:00PM"

## },

## {

## "eway_bill_number":371009218816,

"eway_bill_date":"15/09/202303:10:00PM",
"userGstin":"05AAAAU6537D1ZO",
"document_number":"T1ffr56t7931",

## "document_date":"04/05/2023",

"gstin_of_consignor":"05AAAAU6537D1ZO",
"legal_name_of_consignor":"LPG",
"gstin_of_consignee":"24ANGPR7652E1ZV",
"legal_name_of_consignee":"IsPvt.Ltd.",

## "total_invoice_value":119,

"eway_bill_valid_date":"23/09/202311:59:00PM"

## }

## ]

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"325:Couldnotretrievedata",
"status":"NoContent",

## "code":204,

## "nic_code":"325"

## }

## }

#13:GetGSTINDetails
Method:GET

URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetGSTINDetails&userGstin=24ANGPR7652E1ZV
&gstin=05AAAAU6537D1ZO'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

"gstin_of_taxpayer":"05AAAAU6537D1ZO",
"trade_name":"M/SUTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"legal_name_of_business":"UTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"address1":"UCREPeelikothi,Nearthenainitalbankltd,KaladhungiRoad",
"address2":"263139Peelikothi",
"state_name":"UTTARAKHAND",

## "pincode":"263139",

"taxpayer_type":"REG",
"status":"ACT",

## "block_status":""

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"325:Couldnotretrievedata",
"status":"NoContent",

## "code":204,

## "nic_code":"325"

## }

## }

#14:GetTransporterDetails
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetGSTINDetails&userGstin=24ANGPR7652E1ZV
&gstin=05AAAAU6537D1ZO'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

"gstin_of_taxpayer":"05AAAAU6537D1ZO",
"trade_name":"M/SUTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"legal_name_of_business":"UTTARAYANCO-OPERATIVEFORRENEWABLEENERGY",
"address1":"UCREPeelikothi,Nearthenainitalbankltd,KaladhungiRoad",
"address2":"263139Peelikothi",
"state_name":"UTTARAKHAND",

## "pincode":"263139",

"taxpayer_type":"REG",
"status":"ACT",

## "block_status":""

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"328:Couldnotretrievetransporterdetailsfromgstin",
"status":"NoContent",

## "code":204,

## "nic_code":"328"

## }

## }

#15:GETHSNDetails
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetHsnDetailsByHsnCode&gstin=05AAABB0639
G1Z8&hsncode=1001'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

## "hsn_code":"1001",

"hsn_description":"WHEATANDMESLIN-Durumwheat:"

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"216:InvalidHSNCode",
"status":"NoContent",

## "code":204,

## "nic_code":"216"

## }

## }

#16:GetEWBByConsignor
Method:GET
URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillGeneratedByConsigner&gstin=05AA
ABB0639G1Z8&document_number=IMP/23/035&document_type=TaxInvoice
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":{

"ewayBillNo":321009218808,
"ewayBillDate":"15/09/202302:44:00PM",
"validUpto":"24/09/202323:59:59",

## "alert":""

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"418:Norecordfound.",
"status":"NoContent",

## "code":204,

## "nic_code":"418"

## }

## }

#17:GetEWBByDate
Method:GET
URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsByDate&gstin=24ANGPR7652E1ZV

## &generated_date=15/09/2023

header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'

SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218840,

"eway_bill_date":"15/09/202304:21:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC-505/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218837,

"eway_bill_date":"15/09/202304:13:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC/GD-4/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":381009218835,

"eway_bill_date":"15/09/202304:09:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-9/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218834,

"eway_bill_date":"15/09/202304:07:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"abc153",

## "document_date":"11/09/2023",

## "pincode_of_delivery":201304,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"Faridabad",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218832,

"eway_bill_date":"15/09/202304:05:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-8/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218821,

"eway_bill_date":"15/09/202303:24:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"04416213384",

## "document_date":"09/01/2022",

## "pincode_of_delivery":496001,

"state_name_of_delivery":"UTTARAKHAND",

## "place_of_delivery":"chandrapur",

"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218808,

"eway_bill_date":"15/09/202302:44:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/035",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218803,

"eway_bill_date":"15/09/202302:37:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/033",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218786,

"eway_bill_date":"15/09/202301:36:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-7/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":351009218782,

"eway_bill_date":"15/09/202301:26:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-6/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218775,

"eway_bill_date":"15/09/202301:02:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"767676",

## "document_date":"09/01/2022",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"VARANASI",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"418:Norecordfound.",
"status":"NoContent",

## "code":204,

## "nic_code":"418"

## }

## }

#18:GetEwayBillsRejectedByOthers
Method:GET
URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsRejectedByOthers&gstin=05AAABB
0639G1Z8&generated_date=15/09/2023
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218808,

"eway_bill_date":"15/09/202302:44:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/035",

## "document_date":"22/06/2023",

"eway_bill_valid_date":"24/09/202311:59:00PM",
"reject_status":"Y",
"reject_date":"15/09/202308:05:00PM",

## "pincode_of_delivery":"",

## "state_name_of_delivery":"",

## "extended_times":"",

## "place_of_delivery":""

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"418:Norecordfound.",
"status":"NoContent",

## "code":204,

## "nic_code":"418"

## }

## }

#19:GetEWBByTransporter1-bydateandstatecode
Method:GET

URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsForTransporterByState&gstin=05AA
ABB0639G1Z8&generated_date=25/06/2023&state_code=5
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218770,

"eway_bill_date":"15/09/202312:38:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801032",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":361009218772,

"eway_bill_date":"15/09/202312:45:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801033",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218773,

"eway_bill_date":"15/09/202312:46:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801034",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218775,

"eway_bill_date":"15/09/202301:02:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"767676",

## "document_date":"09/01/2022",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"VARANASI",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":351009218782,

"eway_bill_date":"15/09/202301:26:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-6/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218786,

"eway_bill_date":"15/09/202301:36:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-7/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":341009218789,

"eway_bill_date":"15/09/202301:52:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/1",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",

## "eway_bill_valid_date":"",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218803,

"eway_bill_date":"15/09/202302:37:00PM",

"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/033",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":391009218812,

"eway_bill_date":"15/09/202302:58:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/5",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":361009218813,

"eway_bill_date":"15/09/202302:59:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/6",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":331009218814,

"eway_bill_date":"15/09/202303:08:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/7",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218816,

"eway_bill_date":"15/09/202303:10:00PM",
"eway_bill_status":"Active",

"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"T1ffr56t7931",

## "document_date":"04/05/2023",

## "pincode_of_delivery":396210,

"state_name_of_delivery":"DADARANDNAGARHAVELI&DAMANANDDIU",
"place_of_delivery":"Singrauli",
"eway_bill_valid_date":"23/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":381009218819,

"eway_bill_date":"15/09/202303:18:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/8",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218821,

"eway_bill_date":"15/09/202303:24:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"04416213384",

## "document_date":"09/01/2022",

## "pincode_of_delivery":496001,

"state_name_of_delivery":"CHHATTISGARH",

## "place_of_delivery":"chandrapur",

"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218832,

"eway_bill_date":"15/09/202304:05:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-8/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218834,

"eway_bill_date":"15/09/202304:07:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"abc153",

## "document_date":"11/09/2023",

## "pincode_of_delivery":201304,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"Faridabad",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":381009218835,

"eway_bill_date":"15/09/202304:09:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-9/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218837,

"eway_bill_date":"15/09/202304:13:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC/GD-4/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218840,

"eway_bill_date":"15/09/202304:21:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC-505/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218869,

"eway_bill_date":"15/09/202308:13:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAABC0181E1ZE",

## "document_number":"test/swc/104",

## "document_date":"02/03/2023",

## "pincode_of_delivery":560007,

"state_name_of_delivery":"KARNATAKA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"27/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":391009218870,

"eway_bill_date":"15/09/202308:14:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAABC0181E1ZE",

## "document_number":"test/swc/105",

## "document_date":"02/03/2023",

## "pincode_of_delivery":560007,

"state_name_of_delivery":"KARNATAKA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"27/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"336:Couldnotretrievetransporterdatabygstin",
"status":"NoContent",

## "code":204,

## "nic_code":"336"

## }

## }

#20:GetEWBByTransporter2-bytransportationwithinstate&date
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsForTransporter&gstin=05AAABB06
39G1Z8&generated_date=15/09/2023'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218770,

"eway_bill_date":"15/09/202312:38:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801032",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":361009218772,

"eway_bill_date":"15/09/202312:45:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801033",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218773,

"eway_bill_date":"15/09/202312:46:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"MIPL/169801034",

## "document_date":"02/11/2022",

## "pincode_of_delivery":247663,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218775,

"eway_bill_date":"15/09/202301:02:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"767676",

## "document_date":"09/01/2022",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"VARANASI",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":351009218782,

"eway_bill_date":"15/09/202301:26:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-6/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218786,

"eway_bill_date":"15/09/202301:36:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-7/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":341009218789,

"eway_bill_date":"15/09/202301:52:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/1",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",

## "eway_bill_valid_date":"",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218803,

"eway_bill_date":"15/09/202302:37:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/033",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":391009218812,

"eway_bill_date":"15/09/202302:58:00PM",

"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/5",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":361009218813,

"eway_bill_date":"15/09/202302:59:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/6",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":331009218814,

"eway_bill_date":"15/09/202303:08:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/7",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218816,

"eway_bill_date":"15/09/202303:10:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",
"document_number":"T1ffr56t7931",

## "document_date":"04/05/2023",

## "pincode_of_delivery":396210,

"state_name_of_delivery":"DADARANDNAGARHAVELI&DAMANANDDIU",
"place_of_delivery":"Singrauli",
"eway_bill_valid_date":"23/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":381009218819,

"eway_bill_date":"15/09/202303:18:00PM",
"eway_bill_status":"Active",

"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/8",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218821,

"eway_bill_date":"15/09/202303:24:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"04416213384",

## "document_date":"09/01/2022",

## "pincode_of_delivery":496001,

"state_name_of_delivery":"CHHATTISGARH",

## "place_of_delivery":"chandrapur",

"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":371009218832,

"eway_bill_date":"15/09/202304:05:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"FG-OT-8/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218834,

"eway_bill_date":"15/09/202304:07:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

## "document_number":"abc153",

## "document_date":"11/09/2023",

## "pincode_of_delivery":201304,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"Faridabad",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":381009218835,

"eway_bill_date":"15/09/202304:09:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",

"document_number":"FG-OT-9/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218837,

"eway_bill_date":"15/09/202304:13:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC/GD-4/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":321009218840,

"eway_bill_date":"15/09/202304:21:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"DC-505/23-24",

## "document_date":"15/09/2023",

## "pincode_of_delivery":201301,

"state_name_of_delivery":"UTTARPRADESH",
"place_of_delivery":"NOIDA",
"eway_bill_valid_date":"16/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":331009218869,

"eway_bill_date":"15/09/202308:13:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAABC0181E1ZE",

## "document_number":"test/swc/104",

## "document_date":"02/03/2023",

## "pincode_of_delivery":560007,

"state_name_of_delivery":"KARNATAKA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"27/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":391009218870,

"eway_bill_date":"15/09/202308:14:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAABC0181E1ZE",

## "document_number":"test/swc/105",

## "document_date":"02/03/2023",

## "pincode_of_delivery":560007,

"state_name_of_delivery":"KARNATAKA",
"place_of_delivery":"BemlNagar",
"eway_bill_valid_date":"27/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"N"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"336:Couldnotretrievetransporterdatabygstin",
"status":"NoContent",

## "code":204,

## "nic_code":"336"

## }

## }

#21:GetEWBByTransporter3-BysupplierGSTIN&date
Method:GET
URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillsForTransporterByGstin&gstin=05AA
AAU6537D1ZO&eway_bill_generator_gstin=24ANGPR7652E1ZV&generated_date=15/09/2023
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218808,

"eway_bill_date":"15/09/202302:44:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/035",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"336:Couldnotretrievetransporterdatabygstin",
"status":"NoContent",

## "code":204,

## "nic_code":"336"

## }

## }

#22:GetEWBByTransporter4-BydateofassignmentofEWayBilland
statecode
Method:GET
URL:https://sandb-
api.mastersindia.co/api/v1/getEwayBillData/?action=GetEwayBillReportByTransporterassignedDate&
gstin=05AAAAU6537D1ZO&assigned_date=15/09/2023&state_code=5
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "message":[

## {

## "eway_bill_number":321009218808,

"eway_bill_date":"15/09/202302:44:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"24ANGPR7652E1ZV",
"document_number":"IMP/23/035",

## "document_date":"22/06/2023",

## "pincode_of_delivery":248001,

"state_name_of_delivery":"UTTARAKHAND",
"place_of_delivery":"Dehradun",
"eway_bill_valid_date":"24/09/202311:59:00PM",

## "extended_times":0,

"reject_status":"Y"

## },

## {

## "eway_bill_number":341009218804,

"eway_bill_date":"15/09/202302:38:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/3",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",

## "eway_bill_valid_date":"",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":311009218805,

"eway_bill_date":"15/09/202302:39:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/4",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",

## "eway_bill_valid_date":"",

## "extended_times":0,

"reject_status":"N"

## },

## {

## "eway_bill_number":301009218790,

"eway_bill_date":"15/09/202301:55:00PM",
"eway_bill_status":"Active",
"gstin_of_generator":"05AAAAU6537D1ZO",

## "document_number":"eway/pctt11/2",

## "document_date":"10/05/2018",

## "pincode_of_delivery":121004,

"state_name_of_delivery":"HARYANA",
"place_of_delivery":"BemlNagar",

## "eway_bill_valid_date":"",

## "extended_times":0,

"reject_status":"N"

## }

## ],

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"336:Couldnotretrievetransporterdatabygstin",
"status":"NoContent",

## "code":204,

## "nic_code":"336"

## }

## }

#23:DistanceAPI
Method:GET
URL:'https://sandb-api.mastersindia.co/api/v1/distance/?fromPincode=201301&toPincode=560093'

header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":{

## "distance":2145.456,

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

"message":"Invalidpincode",
"status":"NoContent",

## "code":204

## }

## }

#24:ReturnStatus(BlockedandUnblocked)
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/returnStatus/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"user_gstin":"24ANGPR7652E1ZV",
"GSTIN_Status":"N",

## "gstin_list":[

## {

"gstin":"24ANGPR7652E1ZV"

## },

## {

"gstin":"05AAAAU6537D1ZO"

## }

## ]

## }'

SuccessResponse:

## {

## "results":{

## "message":{

"24ANGPR7652E1ZV":"Unblocked",
"05AAAAU6537D1ZO":"Unblocked"

## },

"status":"Success",

## "code":200

## }

## }

FailedResponse:

## {

## "results":{

## "message":{

"05AAABB0639G1Z1":"Incorrectuserid/Userdoesnotexists",
"05AAAAU6537D1Z1":"Incorrectuserid/Userdoesnotexists"

## },

"status":"Fail",

## "code":204

## }

## }

#25:GenerateE-WayBillInBulk
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/ewayBillsGenerateInBulk/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{
"ewayBillList":[

## {

"userGstin":"24ANGPR7652E1ZV",

## "supply_type":"outward",

"sub_supply_type":"Others",

## "sub_supply_description":"salesfromothercountry",

## "document_type":"taxinvoice",

## "document_number":"lkkkkk-1021",

## "document_date":"10/05/2018",

"gstin_of_consignor":"24ANGPR7652E1ZV",

## "legal_name_of_consignor":"welton",

"address1_of_consignor":"2NDCROSSNO5919A",
"address2_of_consignor":"GROUNDFLOOROSBORNEROAD",
"place_of_consignor":"Dehradun",

## "pincode_of_consignor":248001,

"state_of_consignor":"UTTARAKHAND",
"actual_from_state_name":"UTTARAKHAND",
"gstin_of_consignee":"05AAAAU6537D1ZO",

## "legal_name_of_consignee":"sthuthya",

"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"BemlNagar",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",
"actual_to_state_name":"UTTARAKHAND",

## "total_invoice_value":6002581.23,

## "taxable_amount":5609889,

## "cgst_amount":84148.335,

## "sgst_amount":84148.335,

## "igst_amount":0,

## "cess_amount":224395.56,

"transporter_id":"05AAABC0181E1ZE",

## "transporter_name":"",

## "transporter_document_number":"",

## "transporter_document_date":"",

## "transportation_mode":"road",

## "transportation_distance":"100",

"vehicle_number":"PVC1234",
"vehicle_type":"Regular",

## "generate_status":1,

## "data_source":"erp",

## "user_ref":"1232435466sdsf234",

"location_code":"XYZ",
"eway_bill_status":"ABC",
"auto_print":"Y",
"itemList":[

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## }

## ]

## },

## {

"userGstin":"24ANGPR7652E1ZV",

## "supply_type":"outward",

"sub_supply_type":"Others",

## "sub_supply_description":"salesfromothercountry",

## "document_type":"taxinvoice",

## "document_number":"lkkkkk-1033",

## "document_date":"10/05/2018",

"gstin_of_consignor":"24ANGPR7652E1ZV",

## "legal_name_of_consignor":"welton",

"address1_of_consignor":"2NDCROSSNO5919A",
"address2_of_consignor":"GROUNDFLOOROSBORNEROAD",
"place_of_consignor":"Dehradun",

## "pincode_of_consignor":248001,

"state_of_consignor":"UTTARAKHAND",
"actual_from_state_name":"UTTARAKHAND",
"gstin_of_consignee":"05AAAAU6537D1ZO",

## "legal_name_of_consignee":"sthuthya",

"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"BemlNagar",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",
"actual_to_state_name":"UTTARAKHAND",

## "total_invoice_value":6002581.23,

## "taxable_amount":5609889,

## "cgst_amount":84148.335,

## "sgst_amount":84148.335,

## "igst_amount":0,

## "cess_amount":224395.56,

## "transporter_id":"",

## "transporter_name":"",

## "transporter_document_number":"",

## "transporter_document_date":"",

## "transportation_mode":"road",

## "transportation_distance":"100",

"vehicle_number":"PVC1234",
"vehicle_type":"Regular",

## "generate_status":1,

## "data_source":"erp",

## "user_ref":"1232435466sdsf234",

"location_code":"XYZ",
"eway_bill_status":"ABC",
"auto_print":"Y",
"itemList":[

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## }

## ]

## }

## ]

## }'

SuccessResponse:

## {

## "results":{

"status":"Success",
"message":"Requesthasbeenaccepted.Pleasegetresponsebytherequestid",

## "code":200,

## "request_status":"pending",

"requestId":"edoc_1694792305_dc85e3f62632"

## }

## }

FailedResponse:

## {

## "error":"invalid_request",

"error_description":"InvalidJsonStructure."

## }

#25A:GetBulkE-WayBillResponse:
Method:GET
URL:'https://sandb-
api.mastersindia.co/api/v1/getBulkEwayBillsResponse/?request_id=edoc_1694792305_dc85e3f6263

## 2'

header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":[

## {

## "message":{

"ewayBillNo":331009218872,
"ewayBillDate":"15/09/202309:05:00PM",
"validUpto":"16/09/202311:59:00PM",

## "alert":"",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65047a724b0fa9b8fe92d11d/"

## },

"status":"Success",

## "code":200,

"requestId":"ERP1694792306_lkkkkk-1021",
"docNo":"lkkkkk-1021"

## },

## {

## "message":{

"ewayBillNo":301009218873,
"ewayBillDate":"15/09/202309:05:00PM",
"validUpto":"16/09/202311:59:00PM",

## "alert":"",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65047a734b0fa9b8fe92d11f/"

## },

"status":"Success",

## "code":200,

"requestId":"ERP1694792307_lkkkkk-1033",
"docNo":"lkkkkk-1033"

## }

## ]

## }

FailedResponse:

## {

## "results":{

"status":"NoContent",

## "code":204,

## "request_status":"",

"requestId":"edoc_1694792305_dc85e3f62631",
"message":"Norecordsfound."

## }

## }

#26:GenerateE-WayRequestinBulk-Generate/Update/Extend
Note:InthisAPIAction+payloadwilldefinewhatactionneedtobeperform-Generate/Update/

## Extendinbulk.

action=['eway','update_partb','extend','update_trans','cancel_eway','get_eway']
Method:Post
URL:'https://sandb-api.mastersindia.co/api/v1/bulkEwayApiRequest/'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
data'{

## "action":"eway",

## "list":[

## {

"userGstin":"24ANGPR7652E1ZV",

## "supply_type":"outward",

"sub_supply_type":"Others",

## "sub_supply_description":"salesfromothercountry",

## "document_type":"taxinvoice",

## "document_number":"jjjkhh-1055",

## "document_date":"10/05/2018",

"gstin_of_consignor":"24ANGPR7652E1ZV",

## "legal_name_of_consignor":"welton",

"address1_of_consignor":"2NDCROSSNO5919A",
"address2_of_consignor":"GROUNDFLOOROSBORNEROAD",
"place_of_consignor":"Dehradun",

## "pincode_of_consignor":248001,

"state_of_consignor":"UTTARAKHAND",
"actual_from_state_name":"UTTARAKHAND",
"gstin_of_consignee":"05AAAAU6537D1ZO",

## "legal_name_of_consignee":"sthuthya",

"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"BemlNagar",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",
"actual_to_state_name":"UTTARAKHAND",

## "total_invoice_value":6002581.23,

## "taxable_amount":5609889,

## "cgst_amount":84148.335,

## "sgst_amount":84148.335,

## "igst_amount":0,

## "cess_amount":224395.56,

"transporter_id":"05AAABC0181E1ZE",

## "transporter_name":"",

## "transporter_document_number":"",

## "transporter_document_date":"",

## "transportation_mode":"road",

## "transportation_distance":"100",

"vehicle_number":"PVC1234",
"vehicle_type":"Regular",

## "generate_status":1,

## "data_source":"erp",

## "user_ref":"1232435466sdsf234",

"location_code":"XYZ",
"eway_bill_status":"ABC",
"auto_print":"Y",
"itemList":[

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## }

## ]

## },

## {

"userGstin":"24ANGPR7652E1ZV",

## "supply_type":"outward",

"sub_supply_type":"Others",

## "sub_supply_description":"salesfromothercountry",

## "document_type":"taxinvoice",

## "document_number":"abbbbdc-1066",

## "document_date":"10/05/2018",

"gstin_of_consignor":"24ANGPR7652E1ZV",

## "legal_name_of_consignor":"welton",

"address1_of_consignor":"2NDCROSSNO5919A",
"address2_of_consignor":"GROUNDFLOOROSBORNEROAD",
"place_of_consignor":"Dehradun",

## "pincode_of_consignor":248001,

"state_of_consignor":"UTTARAKHAND",
"actual_from_state_name":"UTTARAKHAND",
"gstin_of_consignee":"05AAAAU6537D1ZO",

## "legal_name_of_consignee":"sthuthya",

"address1_of_consignee":"ShreeNilaya",
"address2_of_consignee":"Dasarahosahalli",
"place_of_consignee":"BemlNagar",

## "pincode_of_consignee":248001,

"state_of_supply":"UTTARAKHAND",
"actual_to_state_name":"UTTARAKHAND",

## "total_invoice_value":6002581.23,

## "taxable_amount":5609889,

## "cgst_amount":84148.335,

## "sgst_amount":84148.335,

## "igst_amount":0,

## "cess_amount":224395.56,

## "transporter_id":"",

## "transporter_name":"",

## "transporter_document_number":"",

## "transporter_document_date":"",

## "transportation_mode":"road",

## "transportation_distance":"100",

"vehicle_number":"PVC1234",
"vehicle_type":"Regular",

## "generate_status":1,

## "data_source":"erp",

## "user_ref":"1232435466sdsf234",

"location_code":"XYZ",
"eway_bill_status":"ABC",
"auto_print":"Y",
"itemList":[

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## },

## {

"product_name":"Wheat",
"product_description":"Wheat",

## "hsn_code":1001,

## "quantity":4,

"unit_of_product":"BOX",

## "cgst_rate":1.5,

## "sgst_rate":1.5,

## "igst_rate":0,

## "cess_rate":0,

"cessAdvol":0,

## "taxable_amount":5609889

## }

## ]

## }

## ]

## }'

SuccessResponse:

## {

## "results":{

"status":"Success",
"message":"Requesthasbeenaccepted.Pleasegetresponsebytherequestid",

## "code":200,

## "request_status":"pending",

## "request_id":"edoc_1694792590_8200e8dcd6de"

## }

## }

FailedResponse:

## {

## "results":{

"status":"NoContent",
"message":"InvalidAction",

## "code":204,

"request_status":"NotAccepted",

## "request_id":""

## }

## }

#26A:GetE-WayResponseinBulk
Method:GET

URL:'https://sandb-
api.mastersindia.co/api/v1/bulkEwayApiResponse?request_id=edoc_1694792590_8200e8dcd6de'
header'Authorization:JWT
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo2NDYsInVzZXJuYW1lIjoiYW1hbkBtYXN0ZXJza
W5kaWEuY28iLCJleHAiOjE2OTQ4MzU1NjQsImVtYWlsIjoiYW1hbkBtYXN0ZXJzaW5kaWEuY28iLCJvcmln
X2lhdCI6MTY5NDc0OTE2NH0.4GlIszMi44lQfrJJ3Mv00DSN2ZKdJo7n0aAUh-oBh5U'
SuccessResponse:

## {

## "results":[

## {

## "message":{

"ewayBillNo":371009218874,
"ewayBillDate":"15/09/202309:10:00PM",
"validUpto":"16/09/202311:59:00PM",

## "alert":"",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65047b8f4b0fa9b8fe92d121/"

## },

"status":"Success",

## "code":200,

"requestId":"ERP1694792591_jjjkhh-1055",
"docNo":"jjjkhh-1055"

## },

## {

## "message":{

"ewayBillNo":341009218875,
"ewayBillDate":"15/09/202309:10:00PM",
"validUpto":"16/09/202311:59:00PM",

## "alert":"",

## "error":false,

"url":"sandb-api.mastersindia.co/api/v1/detailPrintPdf/anVsX3NlcF8yMDIzLTI0-

## 65047b8f4b0fa9b8fe92d123/"

## },

"status":"Success",

## "code":200,

"requestId":"ERP1694792591_abbbbdc-1066",
"docNo":"abbbbdc-1066"

## }

## ]

## }

FailedResponse:

## {

## "results":{

"status":"NoContent",

## "code":204,

## "request_status":"",

## "request_id":"edoc_1694792590_8200e8dcd6d",

"message":"Norecordsfound."

## }

## }
