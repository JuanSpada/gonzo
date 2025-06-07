import axios from 'axios';
var username = 'geonode_svsVqfLttY-type-residential';
var password = '0ea5b7f5-88ad-4668-9028-14f2614d10fe';
var GEONODE_DNS = 'sg.proxy.geonode.io';
var GEONODE_PORT = 9000;

const randomEmail = () => {
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${
    randomString
  }@example.com`;
}
const email = randomEmail();
axios
  .post(
    'https://www.infousados.com/password_forgotten.php?action=process',
    {
      email_address: email,
      formid: "f51962a0edd0cf79dee4d4a67cbf328f"
    },
    {
      proxy: {
        protocol: 'http',
        host: GEONODE_DNS,
        port: GEONODE_PORT,
        auth: {
          username,
          password,
        },
      },
    }
  )
  .then((res) => {
    console.log(res.data);
  })
  .catch((err) => console.error(err));