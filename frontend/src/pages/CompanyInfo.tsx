import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  Settings,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

interface QBOCompanyInfo {
  Id: string;
  CompanyName: string;
  LegalName: string;
  CompanyAddr: any;
  CustomerCommunicationAddr: any;
  CustomerCommunicationEmailAddr?: any;
  WebAddr: any;
  Email: any;
  PrimaryPhone?: any;
  NameValue: any[];
  SupportedLanguages: string;
  Country: string;
  FiscalYearStartMonth: string;
  LegalAddr: any;
  MetaData: any;
  ReportPrefs: any;
  Preferences: any;
  DefaultTimeZone?: string;
  CompanyStartDate?: string;
  domain?: string;
  sparse?: boolean;
  time?: string;
  success?: boolean;
  SyncToken?: string;
}

export function CompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<QBOCompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/v1/qbo/company-info");
      const data = await response.json();

      if (data.success) {
        setCompanyInfo(data.data.CompanyInfo);
      } else {
        setError(data.error || "Failed to fetch company information");
        toast.error("Failed to fetch company information");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch company information";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCompanyInfo = async () => {
    setIsRefreshing(true);
    await fetchCompanyInfo();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-danger-600 mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Company Information
              </h1>
              <p className="text-gray-600">
                Unable to load company information
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger-800">{error}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={refreshCompanyInfo}
              disabled={isRefreshing}
              className="btn btn-primary"
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-warning-600 mr-4" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Company Information
              </h1>
              <p className="text-gray-600">No company information available</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={refreshCompanyInfo}
              disabled={isRefreshing}
              className="btn btn-primary"
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Company Information
          </h1>
          <p className="text-gray-600">
            QuickBooks Online company details and configuration
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/qbo-setup" className="btn btn-secondary">
            QBO Setup
          </Link>
          <button
            onClick={refreshCompanyInfo}
            disabled={isRefreshing}
            className="btn btn-primary"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Company Overview Card */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Building2 className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">
            Company Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Company Name</p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.CompanyName}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Legal Name</p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.LegalName}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Company ID</p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.Id}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Country</p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.Country}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">
              Fiscal Year Start
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.FiscalYearStartMonth}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-600">
              Supported Languages
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {companyInfo.SupportedLanguages}
            </p>
          </div>
        </div>
      </div>

      {/* Company Address */}
      {companyInfo.CompanyAddr && (
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Company Address
            </h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyInfo.CompanyAddr.Line1 && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyAddr.Line1}
                  </p>
                </div>
              )}
              {companyInfo.CompanyAddr.City && (
                <div>
                  <p className="text-sm font-medium text-gray-600">City</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyAddr.City}
                  </p>
                </div>
              )}
              {companyInfo.CompanyAddr.CountrySubDivisionCode && (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    State/Province
                  </p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyAddr.CountrySubDivisionCode}
                  </p>
                </div>
              )}
              {companyInfo.CompanyAddr.PostalCode && (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Postal Code
                  </p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyAddr.PostalCode}
                  </p>
                </div>
              )}
              {companyInfo.CompanyAddr.Country && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Country</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyAddr.Country}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legal Address */}
      {companyInfo.LegalAddr && (
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Legal Address
            </h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyInfo.LegalAddr.Line1 && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.LegalAddr.Line1}
                  </p>
                </div>
              )}
              {companyInfo.LegalAddr.City && (
                <div>
                  <p className="text-sm font-medium text-gray-600">City</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.LegalAddr.City}
                  </p>
                </div>
              )}
              {companyInfo.LegalAddr.CountrySubDivisionCode && (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    State/Province
                  </p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.LegalAddr.CountrySubDivisionCode}
                  </p>
                </div>
              )}
              {companyInfo.LegalAddr.PostalCode && (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Postal Code
                  </p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.LegalAddr.PostalCode}
                  </p>
                </div>
              )}
              {companyInfo.LegalAddr.Country && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Country</p>
                  <p className="text-sm text-gray-900">
                    {companyInfo.LegalAddr.Country}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Mail className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">
            Contact Information
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyInfo.Email?.Address && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Email</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.Email.Address}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.CustomerCommunicationEmailAddr?.Address && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Customer Communication Email
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CustomerCommunicationEmailAddr.Address}
                  </p>
                  </div>
              </div>
            </div>
          )}
          {companyInfo.PrimaryPhone?.FreeFormNumber && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Primary Phone
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.PrimaryPhone.FreeFormNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.WebAddr?.URI && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Website</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    <a
                      href={companyInfo.WebAddr.URI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {companyInfo.WebAddr.URI}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Settings */}
      {companyInfo.NameValue && companyInfo.NameValue.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-primary-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Company Settings
            </h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companyInfo.NameValue.map((setting: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium text-gray-600">
                    {setting.Name}
                  </p>
                  <p className="text-sm text-gray-900">{setting.Value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Database className="h-6 w-6 text-primary-600 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">
            System Information
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyInfo.DefaultTimeZone && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Default Timezone
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.DefaultTimeZone}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.CompanyStartDate && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Company Start Date
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.CompanyStartDate}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.domain && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Domain</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">{companyInfo.domain}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.SyncToken && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Database className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Sync Token</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {companyInfo.SyncToken}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.MetaData?.CreateTime && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Created</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(companyInfo.MetaData.CreateTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.MetaData?.LastUpdatedTime && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(
                      companyInfo.MetaData.LastUpdatedTime
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-success-600 mr-3" />
          <h2 className="text-lg font-semibold text-gray-900">
            Connection Status
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-success-50 p-4 rounded-lg border border-success-200">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-success-800">
                  QuickBooks Online
                </p>
                <p className="text-sm text-success-700">Connected and Active</p>
              </div>
            </div>
          </div>
          <div className="bg-success-50 p-4 rounded-lg border border-success-200">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-success-800">
                  Company Data
                </p>
                <p className="text-sm text-success-700">
                  Successfully Retrieved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
