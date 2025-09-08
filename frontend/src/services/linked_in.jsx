import {LinkedIn} from "react-linkedin-login-oauth2";

function LinkedInButton() {
  return (
    <LinkedIn
      clientId="865idn4kffypot"
      redirectUri="http://localhost:5000/api/auth/register"
      onSuccess={(code) => {
        console.log("LinkedIn code:", code);

        // Send code to backend
        fetch("/api/auth/linkedin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
      }}
      onError={(error) => {
        console.error("LinkedIn error", error);
      }}
    >
      {({ linkedInLogin }) => (
        <button
          onClick={linkedInLogin}
          className="linkedin-login-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0a66c2',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '1rem',
            cursor: 'pointer',
            minWidth: '140px',
            height: '40px',
            boxShadow: '0 2px 8px rgba(30, 58, 138, 0.08)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#fff"/>
            <path d="M12.5 13.5H9.5V22.5H12.5V13.5ZM11 12.25C11.8284 12.25 12.5 11.5784 12.5 10.75C12.5 9.92157 11.8284 9.25 11 9.25C10.1716 9.25 9.5 9.92157 9.5 10.75C9.5 11.5784 10.1716 12.25 11 12.25ZM22.5 17.25C22.5 15.1789 21.0711 13.5 18.75 13.5C17.5 13.5 16.75 14.25 16.5 14.75V13.5H13.5V22.5H16.5V17.75C16.5 16.75 17.25 16.25 18 16.25C18.75 16.25 19.5 16.75 19.5 17.75V22.5H22.5V17.25Z" fill="#0a66c2"/>
          </svg>
          <span>Login with LinkedIn</span>
        </button>
      )}
    </LinkedIn>
  );
}
export default LinkedInButton;