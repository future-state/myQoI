import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const sql = require('mssql');

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    try {
        const input_data = req.body;
        if (!input_data) { // Missing request data
            context.res = {
                status: 400,
                body: "Please provide input data."
            }
            return;
        }

        // Create request object
        await sql.connect('Driver={'*****************'}')
        const request = new sql.Request();

        const organization = input_data.organization;
        const latitude = input_data.latitude;
        const longitude = input_data.longitude;
        const download_speed = input_data.download_speed;
        const upload_speed = input_data.upload_speed;
        const latency = input_data.latency;
        const isp = input_data.isp;
        const public_ip = input_data.public_ip;
        const mac_address = input_data.mac_address;
        const manufacturer = input_data.manufacturer;
        const model = input_data.model;
        const serial_no = input_data.serial_no;
        const os = input_data.os;
        const arch = input_data.arch;
        // TODO - validate each of these values exist. The sql inputs will handle type validation I think (confirm.)
        request.input('organization', sql.VarChar(255), organization);
        request.input('latitude', sql.Float, latitude); 
        request.input('longitude', sql.Float, longitude); 
        request.input('download_speed', sql.Float, download_speed); 
        request.input('upload_speed', sql.Float, upload_speed); 
        request.input('latency', sql.Float, latency); 
        request.input('isp', sql.VarChar(45), isp); 
        request.input('public_ip', sql.VarChar(45), public_ip); 
        request.input('mac_address', sql.VarChar(20), mac_address); 
        request.input('manufacturer', sql.VarChar(50), manufacturer); 
        request.input('model', sql.VarChar(50), model); 
        request.input('serial_no', sql.VarChar(50), serial_no); 
        request.input('os', sql.VarChar(50), os); 
        request.input('arch', sql.VarChar(50), arch); 
        let result = await request.query('INSERT INTO QoI_Data ' +
                      '(organization, latitude, longitude, download_speed, upload_speed, latency, isp, public_ip, mac_address, manufacturer, model, serial_no, os, arch) ' +
                      'VALUES ' +
                      '(@organization, @latitude, @longitude, @download_speed, @upload_speed, @latency, @isp, @public_ip, @mac_address, @manufacturer, @model, @serial_no, @os, @arch)')
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