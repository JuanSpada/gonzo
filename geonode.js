import axios from 'axios';
var username = 'geonode_svsVqfLttY-type-residential';
var password = '0ea5b7f5-88ad-4668-9028-14f2614d10fe';
var GEONODE_DNS = 'proxy.geonode.io';
var GEONODE_PORT = 9000;

axios
  .get('http://ec2-15-228-158-129.sa-east-1.compute.amazonaws.com/gonzo', {
    proxy: {
      protocol: 'http',
      host: GEONODE_DNS,
      port: GEONODE_PORT,
      auth: {
        username,
        password,
      },
    },
  })
  .then((res) => {
    console.log(res.data);
  })
  .catch((err) => console.error(err));
