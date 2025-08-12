import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";

export function QBOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const realmId = searchParams.get("realmId");

      if (!code) {
        setStatus("error");
        setMessage("Authorization code not received. Please try again.");
        return;
      }

      // Call the backend to handle the OAuth callback
      const response = await fetch(
        `/api/qbo/callback?code=${code}&state=${state}&realmId=${realmId}`
      );
      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage(
          "QuickBooks Online authorization successful! You can now close this window."
        );

        // Show success toast
        toast.success("QBO authorization completed successfully!");

        // Redirect to QBO setup page after a delay
        setTimeout(() => {
          navigate("/qbo-setup");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Authorization failed. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred during authorization. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === "loading" && (
            <>
              <Loader className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Processing Authorization
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we complete your QuickBooks Online
                authorization...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-success-600" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Authorization Successful!
              </h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Redirecting to QBO Setup page...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-danger-600" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Authorization Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate("/qbo-setup")}
                  className="btn btn-primary btn-md"
                >
                  Return to QBO Setup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
