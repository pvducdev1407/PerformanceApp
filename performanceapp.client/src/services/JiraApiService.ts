import axios, { AxiosInstance } from 'axios';

// Get backend port and Jira config from localStorage
const getApiBaseUrl = (): string => {
  const backendPort = localStorage.getItem('backendPort') || '5178';
  return `http://localhost:${backendPort}/api/Jira`;
};

// API Response wrapper interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface JiraConfig {
  jiraUrl: string;
  username: string;
  password: string;
}

export interface JiraAuthRequest {
  jiraUrl: string;
  username: string;
  password: string;
}

export interface JiraSearchRequest extends JiraAuthRequest {
  jql: string;
  fields?: string[];
}

class JiraApiService {
  private apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Save Jira configuration to localStorage
  saveConfig(config: JiraConfig): void {
    localStorage.setItem('jiraUrl', config.jiraUrl);
    localStorage.setItem('jiraUsername', config.username);
    localStorage.setItem('jiraPassword', config.password);
  }

  // Get Jira configuration from localStorage
  getConfig(): JiraConfig | null {
    const jiraUrl = localStorage.getItem('jiraUrl');
    const username = localStorage.getItem('jiraUsername');
    const password = localStorage.getItem('jiraPassword');

    if (!jiraUrl || !username || !password) {
      return null;
    }

    return { jiraUrl, username, password };
  }

  // Set backend port
  setBackendPort(port: string): void {
    localStorage.setItem('backendPort', port);
    // Reinitialize client with new port
    this.apiClient = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection(config: JiraConfig): Promise<any> {
    try {
      const response = await this.apiClient.post<ApiResponse<any>>('/test-connection', config);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to connect to Jira');
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to connect to Jira');
    }
  }

  async getProjects(config?: JiraConfig): Promise<any> {
    try {
      const cfg = config || this.getConfig();
      if (!cfg) throw new Error('Jira config not found in localStorage');
      const response = await this.apiClient.post<ApiResponse<any>>('/projects', cfg);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch projects');
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch projects');
    }
  }

  async getStatuses(config?: JiraConfig): Promise<any> {
    try {
      const cfg = config || this.getConfig();
      if (!cfg) throw new Error('Jira config not found in localStorage');
      const response = await this.apiClient.post<ApiResponse<any>>('/statuses', cfg);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch statuses');
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statuses');
    }
  }

  async getIssueTypes(config?: JiraConfig): Promise<any> {
    try {
      const cfg = config || this.getConfig();
      if (!cfg) throw new Error('Jira config not found in localStorage');
      const response = await this.apiClient.post<ApiResponse<any>>('/issue-types', cfg);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch issue types');
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch issue types');
    }
  }

  async searchIssues(jql: string, fields?: string[], config?: JiraConfig): Promise<any> {
    try {
      const cfg = config || this.getConfig();
      if (!cfg) throw new Error('Jira config not found in localStorage');
      const request: JiraSearchRequest = {
        ...cfg,
        jql,
        fields,
      };
      const response = await this.apiClient.post<ApiResponse<any>>('/search', request);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to search issues');
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search issues');
    }
  }

  // Call HR API for Jira detail report through backend proxy
  async getHRJiraDetailReport(
    dfrom: string,
    dto: string,
    ma_nv?: string,
    ma_dvcs: string = '01',
    ma_bp: string = '06',
    leader_id: string = '0612'
  ): Promise<any> {
    try {
      // First, try to call through backend proxy if available
      const backendPort = localStorage.getItem('backendPort') || '5178';
      const backendProxyUrl = `http://localhost:${backendPort}/api/HR/JiraDetailReport`;
      
      const payload = {
        searchDynamic: {
          ma_dvcs,
          ma_bp,
          leader_id,
          project: '',
          dfrom,
          dto,
          ma_nv: ma_nv || '',
          ma_qtda: '',
          group_by: 'dev',
          status: '',
          devdfrom: '1900/01/01',
          devdto: '1900/01/01',
          dfrom_request: '1900/01/01',
          dto_request: '1900/01/01',
          mau_bc: '001',
          gridid: 'BCChiTietCVJira',
          culture: 'vi-VN'
        }
      };

      console.log('Calling HR API with payload:', payload);
      
      try {
        // Try backend proxy first
        const proxyResponse = await axios.post(backendProxyUrl, payload, {
          timeout: 30000
        });
        console.log('HR API Response (via proxy):', proxyResponse.data);
        
        if (proxyResponse.data.Success !== false && proxyResponse.data.Result) {
          return proxyResponse.data.Result || [];
        }
      } catch (proxyError: any) {
        console.warn('Backend proxy not available, trying direct API call:', proxyError.message);
        
        // Fallback to direct API call if proxy fails
        const hrApiUrl = 'https://support.itgtechnology.vn:991/HRAPI/api/Reports/BCChiTietCVJiraAPI/GetData';
        const token = '66e61a90-cec4-4c55-9b44-1fe3fb708730-0mR47teWNy8OhsBuKtoteBT88EcrTksqTaC6O6gros4T9CvdQ6eoVwI2YaqVZncbZlxZObCRVZrJ7ao0hzCJxpY65M';
        
        const directResponse = await axios.post(hrApiUrl, payload, {
          headers: {
            token,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        console.log('HR API Response (direct):', directResponse.data);
        
        if (!directResponse.data.Success) {
          throw new Error(directResponse.data.Error || 'API returned Success: false');
        }
        
        return directResponse.data.Result || [];
      }
      
      return [];
    } catch (error: any) {
      console.error('HR API Error:', error);
      const errorMessage = error.response?.data?.Error || error.message || 'Failed to fetch HR report';
      throw new Error(errorMessage);
    }
  }
}

export default new JiraApiService();
