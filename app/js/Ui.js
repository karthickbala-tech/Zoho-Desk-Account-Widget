/**
 * ==========================================
 * ZOHO DESK ACCOUNT WIDGET - UI LOGIC
 * ==========================================
 * 
 * Handles:
 * - Expand/Collapse functionality
 * - Keyboard accessibility
 * - State visibility management
 * - Theme detection
 */

class AccountWidgetUI {
    constructor() {
        this.header = document.getElementById('accountHeader');
        this.content = document.getElementById('accountContent');
        this.isExpanded = false;

        this.stateLoading = document.getElementById('stateLoading');
        this.stateSuccess = document.getElementById('stateSuccess');
        this.stateNoAccount = document.getElementById('stateNoAccount');
        this.stateError = document.getElementById('stateError');
        this.retryButton = document.getElementById('retryButton');
        this.errorMessage = document.getElementById('errorMessage');

        this.onRetry = function () {
            console.log('[UI] Retry clicked; no callback registered.');
        };

        this.init();
    }

    init() {
        console.log('[UI] Initializing account widget UI.');

        if (!this.header || !this.content) {
            console.warn('[UI] Missing header or content container.');
            return;
        }

        this.header.addEventListener('click', () => this.toggleContent());
        this.header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleContent();
            }
        });

        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => this.onRetry());
        }

        this.collapse();
        this.hideAllStates();
        console.log('[UI] Account widget UI initialized.');
    }

    toggleContent() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    expand() {
        if (!this.header || !this.content) {
            return;
        }
        this.header.setAttribute('aria-expanded', 'true');
        this.content.setAttribute('aria-hidden', 'false');
        this.isExpanded = true;
    }

    collapse() {
        if (!this.header || !this.content) {
            return;
        }
        this.header.setAttribute('aria-expanded', 'false');
        this.content.setAttribute('aria-hidden', 'true');
        this.isExpanded = false;
    }

    hideAllStates() {
        if (this.stateLoading) this.stateLoading.style.display = 'none';
        if (this.stateSuccess) this.stateSuccess.style.display = 'none';
        if (this.stateNoAccount) this.stateNoAccount.style.display = 'none';
        if (this.stateError) this.stateError.style.display = 'none';
    }

    showLoading() {
        console.log('[UI] Showing loading state.');
        this.hideAllStates();
        if (this.stateLoading) {
            this.stateLoading.style.display = 'flex';
        }
        this.expand();
    }

    showSuccess(account) {
        console.log('[UI] Showing success state.');
        this.hideAllStates();
        if (this.stateSuccess) {
            this.stateSuccess.style.display = 'block';
        }
        if (account) {
            this.setAccountData(account);
        }
        this.expand();
    }

    showNoAccount() {
        console.log('[UI] Showing no-account state.');
        this.hideAllStates();
        if (this.stateNoAccount) {
            this.stateNoAccount.style.display = 'block';
        }
        this.expand();
    }

    showError(message = 'Unable to load account details.') {
        console.log('[UI] Showing error state:', message);
        this.hideAllStates();
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
        }
        if (this.stateError) {
            this.stateError.style.display = 'block';
        }
        this.expand();
    }

    setRetryCallback(callback) {
        if (typeof callback === 'function') {
            this.onRetry = callback;
        }
    }

    setAccountData(account) {
        if (!account) {
            this.showNoAccount();
            return;
        }

        console.log('[UI] Rendering account:', account);
        this.hideAllStates();
        if (this.stateSuccess) {
            this.stateSuccess.style.display = 'block';
        }

        this.updateDetail('detailAccountName', this.getAccountName(account));
        this.updateDetail('detailAccountOwner', this.getOwnerDisplay(account));
        this.updateDetail('detailAccountType', this.getAccountType(account));
        this.updateDetail('detailEmail', this.getEmail(account), true);
        this.updateDetail('detailPhone', this.getPhone(account));
        this.updateDetail('detailWebsite', this.getWebsite(account), true);
        this.updateDetail('detailAddress', this.getAddress(account));
        this.updateDetail('detailCreatedTime', this.getFormattedDate(account.createdTime));
        this.updateDetail('detailLayout', this.getLayoutName(account));
        this.updateDetail('detailDescription', this.getDescription(account));
        this.expand();
        console.log('[UI] Account rendered successfully.');
    }

    updateDetail(fieldId, value, isLink = false) {
        const element = document.getElementById(fieldId);
        if (!element) {
            console.warn('[UI] Field not found:', fieldId);
            return;
        }

        const safeValue = this.normalizeValue(value);
        if (safeValue === '—') {
            element.textContent = '—';
            return;
        }

        if (isLink && fieldId === 'detailEmail') {
            const email = this.escapeHtml(String(safeValue));
            element.innerHTML = '<a href="mailto:' + email + '">' + email + '</a>';
            return;
        }

        if (isLink && fieldId === 'detailWebsite') {
            let website = String(safeValue);
            if (!website.startsWith('http://') && !website.startsWith('https://')) {
                website = 'https://' + website;
            }
            const safeUrl = this.escapeHtml(website);
            const safeText = this.escapeHtml(String(safeValue));
            element.innerHTML = '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + safeText + '</a>';
            return;
        }

        element.textContent = this.truncateText(String(safeValue), 120);
    }

    normalizeValue(value) {
        if (value === null || value === undefined || value === '') {
            return '—';
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed ? trimmed : '—';
        }

        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                return value.length ? value.join(', ') : '—';
            }
            if (value.name) {
                return value.name;
            }
            if (value.label) {
                return value.label;
            }
            return '—';
        }

        return value;
    }

    truncateText(text, maxLength = 120) {
        if (typeof text !== 'string') {
            return '—';
        }
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getAccountName(account) {
        return account.accountName || account.name || account.companyName || '—';
    }

    getOwnerDisplay(account) {
        if (account.ownerName) {
            return account.ownerName;
        }
        if (typeof account.owner === 'object' && account.owner) {
            return account.owner.name || account.owner.fullName || account.owner.email || '—';
        }
        return account.owner || account.accountOwner || '—';
    }

    getAccountType(account) {
        return account.accountType || account.type || account.companyType || '—';
    }

    getEmail(account) {
        return account.email || account.primaryEmail || account.contactEmail || '—';
    }

    getPhone(account) {
        return account.phone || account.mobile || account.contactNumber || '—';
    }

    getWebsite(account) {
        return account.website || account.webUrl || account.websiteUrl || '—';
    }

    getAddress(account) {
        const parts = [
            account.street,
            account.city,
            account.state,
            account.country
        ].filter((part) => this.normalizeValue(part) !== '—');

        return parts.length ? parts.join(', ') : '—';
    }

    getDescription(account) {
        return account.description || account.notes || '—';
    }

    getLayoutName(account) {
        if (!account.layoutDetails) {
            return account.layout || '—';
        }
        if (typeof account.layoutDetails === 'string') {
            return account.layoutDetails;
        }
        return account.layoutDetails.name || account.layoutDetails.layoutName || account.layout || '—';
    }

    getFormattedDate(value) {
        if (!value) {
            return '—';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        const formatter = new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

        return formatter.format(date);
    }
}

window.accountWidgetUI = new AccountWidgetUI();
console.log('[UI] Global accountWidgetUI instance created.');
