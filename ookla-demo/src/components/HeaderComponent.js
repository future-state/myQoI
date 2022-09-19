import React from 'react';
import {Navbar, NavbarBrand} from 'reactstrap';

const HeaderComponent = () => {
  return (
    <div>
      <Navbar dark color="primary">
        <div>
          <NavbarBrand href="/">Javascript SDK Demo</NavbarBrand>
        </div>
      </Navbar>
    </div>
  );
}

export default HeaderComponent;