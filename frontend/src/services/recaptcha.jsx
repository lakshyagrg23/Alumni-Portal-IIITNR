import React from "react";
import ReCAPTCHA from "react-google-recaptcha";

export default function Recaptcha({ onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
      <ReCAPTCHA
        sitekey="6LfVScArAAAAAGaK-pVh7QKhLVM5qkB3fj-lFHZt"
        onChange={onChange}
      />
    </div>
  );
}
