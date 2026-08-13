(function () {
    'use strict';

    const CONNECTION_NAME = 'deskaccountconnection';
    const DESK_API_BASE_URL = 'https://desk.zoho.in';

    function logSection(title) {
        console.log('=================================');
        console.log(title);
        console.log('=================================');
    }

    function parseDeskResponse(response, label) {
        if (!response) {
            throw new Error(label + ' response is empty.');
        }

        let parsed = response;

        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
            } catch (error) {
                console.error('[' + label.toUpperCase() + '] Invalid JSON response:', error);
                throw new Error(label + ' API returned malformed JSON.');
            }
        }

        if (parsed && typeof parsed === 'object' && typeof parsed.response === 'string') {
            try {
                parsed = JSON.parse(parsed.response);
            } catch (error) {
                console.error('[' + label.toUpperCase() + '] Unable to parse nested response:', error);
                throw new Error(label + ' API returned an invalid nested response.');
            }
        }

        if (parsed && typeof parsed === 'object' && parsed.response && typeof parsed.response === 'object') {
            parsed = parsed.response;
        }

        if (parsed && typeof parsed === 'object' && parsed.statusMessage && typeof parsed.statusMessage === 'object' && parsed.statusMessage.errorCode) {
            console.error('[' + label.toUpperCase() + '] Scope or API error:', parsed.statusMessage);
            throw new Error(extractDeskError(parsed, label));
        }

        if (parsed && typeof parsed === 'object' && parsed.errorCode) {
            console.error('[' + label.toUpperCase() + '] API error:', parsed);
            throw new Error(extractDeskError(parsed, label));
        }

        if (parsed && typeof parsed === 'object' && parsed.statusCode && parsed.statusCode >= 400) {
            throw new Error(parsed.errorMessage || label + ' request failed.');
        }

        if (parsed && parsed.status === 'false') {
            throw new Error(parsed.statusMessage || label + ' request failed.');
        }

        return parsed;
    }

    function getTicketUrl(ticketId) {
        return DESK_API_BASE_URL + '/api/v1/tickets/' + encodeURIComponent(ticketId);
    }

    function getAccountUrl(accountId) {
        return DESK_API_BASE_URL + '/api/v1/accounts/' + encodeURIComponent(accountId);
    }

    function resolveTicketFromResponse(ticketResponse) {
        if (!ticketResponse) {
            return null;
        }

        if (ticketResponse.statusMessage && typeof ticketResponse.statusMessage === 'object') {
            return ticketResponse.statusMessage;
        }

        return ticketResponse;
    }

    function resolveAccountFromResponse(accountResponse) {
        if (!accountResponse) {
            return null;
        }

        if (accountResponse.statusMessage && typeof accountResponse.statusMessage === 'object' && !accountResponse.statusMessage.errorCode) {
            return accountResponse.statusMessage;
        }

        if (accountResponse.data && typeof accountResponse.data === 'object') {
            return accountResponse.data;
        }

        if (accountResponse.account && typeof accountResponse.account === 'object') {
            return accountResponse.account;
        }

        return accountResponse;
    }

    function extractDeskError(parsed, label) {
        if (!parsed) {
            return label + ' request failed.';
        }

        if (parsed.statusMessage && typeof parsed.statusMessage === 'object' && parsed.statusMessage.errorCode) {
            const message = parsed.statusMessage.message || 'The OAuth Token does not contain the scope to perform this operation.';
            return parsed.statusMessage.errorCode + ': ' + message;
        }

        if (parsed.errorCode) {
            return parsed.errorCode + ': ' + (parsed.message || label + ' request failed.');
        }

        if (parsed.message) {
            return parsed.message;
        }

        return label + ' request failed.';
    }

    function showUiError(message) {
        if (window.accountWidgetUI && typeof window.accountWidgetUI.showError === 'function') {
            window.accountWidgetUI.showError(message);
        }
    }

    function showNoAccountUi() {
        if (window.accountWidgetUI && typeof window.accountWidgetUI.showNoAccount === 'function') {
            window.accountWidgetUI.showNoAccount();
        }
    }

    function showLoadingUi() {
        if (window.accountWidgetUI && typeof window.accountWidgetUI.showLoading === 'function') {
            window.accountWidgetUI.showLoading();
        }
    }

    function loadAccountData() {
        console.log('=================================');
        console.log('Zoho Desk Account Widget');
        console.log('=================================');

        showLoadingUi();

        ZOHODESK.extension.onload()
            .then(function () {
                console.log('[TICKET] Extension initialized.');
                return ZOHODESK.get('ticket.id');
            })
            .then(function (context) {
                const ticketId = context && (context['ticket.id'] || context.ticketId || (context.ticket && context.ticket.id));
                console.log('[TICKET] Ticket ID:', ticketId);

                if (!ticketId) {
                    throw new Error('Ticket ID not found.');
                }

                const ticketUrl = getTicketUrl(ticketId);
                console.log('[TICKET] API URL:', ticketUrl);

                return ZOHODESK.request({
                    url: ticketUrl,
                    type: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    postBody: {},
                    connectionLinkName: CONNECTION_NAME
                });
            })
            .then(function (apiResponse) {
                logSection('[TICKET] API Response');
                console.log(apiResponse);

                const ticketResponse = parseDeskResponse(apiResponse, 'Ticket');
                console.log('[TICKET] Parsed Ticket:', ticketResponse);

                const ticket = resolveTicketFromResponse(ticketResponse);
                if (!ticket) {
                    throw new Error('Ticket data not found.');
                }

                const accountId = ticket.accountId;
                console.log('[TICKET] Account ID:', accountId);
                window.currentTicket = ticket;
                window.currentAccountId = accountId;

                if (!accountId) {
                    console.log('[TICKET] No account associated with this ticket.');
                    showNoAccountUi();
                    return null;
                }

                const accountUrl = getAccountUrl(accountId);
                console.log('[ACCOUNT] Account API URL:', accountUrl);

                return ZOHODESK.request({
                    url: accountUrl,
                    type: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    postBody: {},
                    connectionLinkName: CONNECTION_NAME
                });
            })
            .then(function (apiResponse) {
                if (apiResponse === null || apiResponse === undefined) {
                    return null;
                }

                logSection('[ACCOUNT] API Response');
                console.log(apiResponse);

                const accountResponse = parseDeskResponse(apiResponse, 'Account');
                console.log('[ACCOUNT] Parsed Account:', accountResponse);

                const account = resolveAccountFromResponse(accountResponse);
                if (!account || !account.id) {
                    console.error('[ACCOUNT] Invalid account data:', accountResponse);
                    throw new Error('Account data not found.');
                }

                window.currentAccount = account;
                console.log('[ACCOUNT] Final account data:', account);

                if (window.accountWidgetUI && typeof window.accountWidgetUI.showSuccess === 'function') {
                    window.accountWidgetUI.showSuccess(account);
                } else if (window.accountWidgetUI && typeof window.accountWidgetUI.setAccountData === 'function') {
                    window.accountWidgetUI.setAccountData(account);
                }

                return account;
            })
            .catch(function (error) {
                console.error('[ERROR] Account widget load failed:', error);
                const message = error && error.message ? error.message : 'Unable to load account details.';

                if (/SCOPE_MISMATCH/i.test(message)) {
                    console.error('[ACCOUNT] Scope error:', message);
                }
                if (/UNAUTHORIZED|401|403/i.test(message)) {
                    console.error('[ACCOUNT] Authentication error:', message);
                }
                if (/INVALID|malformed|JSON/i.test(message)) {
                    console.error('[ACCOUNT] Invalid API payload:', message);
                }

                showUiError(message);
            });
    }

    window.addEventListener('DOMContentLoaded', function () {
        if (window.accountWidgetUI && typeof window.accountWidgetUI.setRetryCallback === 'function') {
            window.accountWidgetUI.setRetryCallback(loadAccountData);
        }
        loadAccountData();
    });
})();
