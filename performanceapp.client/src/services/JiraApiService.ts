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
}

export default new JiraApiService();
