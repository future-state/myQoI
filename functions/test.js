const sql = require('mssql');

async function runQuery() {
  try {
    // Create request object
    await sql.connect('Driver={**************************************')
    const request = new sql.Request();

    const latitude = 0;
    const longitude = 1;
    const download_speed = 2;
    const upload_speed = 3;
    const latency = 4;
    const isp = '5';
    const public_ip = '6';
    const local_ip = '7';
    const mac_address = '8';
    const manufacturer = '9';
    const model = '10';
    const serial_no = '11';
    // TODO - validate each of these values exist. The sql inputs will handle type validation I think (confirm.)
    request.input('latitude', sql.Float, latitude); 
    request.input('longitude', sql.Float, longitude); 
    request.input('download_speed', sql.Float, download_speed); 
    request.input('upload_speed', sql.Float, upload_speed); 
    request.input('latency', sql.Float, latency); 
    request.input('isp', sql.VarChar(45), isp); 
    request.input('public_ip', sql.VarChar(45), public_ip); 
    request.input('local_ip', sql.VarChar(45), local_ip); 
    request.input('mac_address', sql.VarChar(20), mac_address); 
    request.input('manufacturer', sql.VarChar(50), manufacturer); 
    request.input('model', sql.VarChar(50), model); 
    request.input('serial_no', sql.VarChar(50), serial_no); 
    request.query('INSERT INTO QoI_Data' +
                  '(latitude, longitude, download_speed, upload_speed, latency, isp, public_ip, local_ip, mac_address, manufacturer, model, serial_no) ' +
                  'VALUES ' +
                  '(@latitude, @longitude, @download_speed, @upload_speed, @latency, @isp, @public_ip, @local_ip, @mac_address, @manufacturer, @model, @serial_no)',
    (err, result) => {
      console.log('Query ran');
      console.log(err);
      console.log(result);
    });
  } catch (err) {
    context.log('Logging is working, this is error');
    console.log(err);
  }
}

runQuery();