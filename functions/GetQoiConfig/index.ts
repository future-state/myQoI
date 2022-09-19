import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const sql = require('mssql');

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        const input_data = req.body;
        let result = null;
        const request = new sql.Request();
        const organization = input_data.organization;
        const query = "";
        request.input('organization', sql.VarChar(45), organization); 

        if (!input_data) { // Missing request data
            context.res = {
                status: 400,
                body: "Please provide input data."
            }
            return;
        }

        try {
            // Create request object
            await sql.connect('Driver={*****')
        }
        catch (err) {
            context.res = {
                status: 400,
                body: "Database Unavailable"
            }
            return;
        }
       
        try {
            // Get the results for the organization
            result = await request.query(query)
            // Parse the result to just give back minimal JSON for the single object
            result = result.recordset[0];
        }
        catch{
            try{
                // Try again to Get the results for the organization after wait
                result = await request.query(query)
                // Parse the result to just give back minimal JSON for the single object
                result = result.recordset[0];
            }
            catch (err){
                context.res = {
                    status: 400,
                    body: "Error after initial Azure Function Deploy " + err
                }
                return;
            }
        }

       

        // If result null give feedback to user
        if (!result) { // Missing request data
            context.res = {
                status: 400,
                body: "No Results Found."
            }
            return;
        }
        
        //Success send back results
        context.res = {
            status: 200,
            body: result
        }
    } catch (err) {
        context.res = {
            status: 400,
            body: err
        }
    }
};

export default httpTrigger;