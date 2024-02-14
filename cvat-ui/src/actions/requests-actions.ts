// Copyright (C) 2024 CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { ActionUnion, createAction, ThunkAction } from 'utils/redux';
import {
    RequestsQuery,
} from 'reducers';
import {
    getCore, MLModel, RQStatus, Request,
} from 'cvat-core-wrapper';
import { filterNull } from 'utils/filter-null';

export enum RequestsActionsTypes {
    GET_REQUESTS = 'GET_REQUESTS',
    GET_REQUESTS_SUCCESS = 'GET_REQUESTS_SUCCESS',
    GET_REQUESTS_FAILED = 'GET_REQUESTS_FAILED',
    GET_REQUESTS_STATUS_SUCCESS = 'GET_REQUESTS_STATUS_SUCCESS',
    GET_REQUESTS_STATUS_FAILED = 'GET_REQUESTS_STATUS_FAILED',
}

export const requestsActions = {
    getRequests: (query?: RequestsQuery) => createAction(RequestsActionsTypes.GET_REQUESTS, { query }),
    getRequestsSuccess: (requests: Request[], count: number) => createAction(
        RequestsActionsTypes.GET_REQUESTS_SUCCESS, { requests, count },
    ),
    getRequestsFailed: (error: any) => createAction(RequestsActionsTypes.GET_REQUESTS_FAILED, {
        error,
    }),
    getRequestStatusSuccess: (request: Request) => (
        createAction(RequestsActionsTypes.GET_REQUESTS_STATUS_SUCCESS, {
            request,
        })
    ),
    getRequestStatusFailed: (request: Request, error: any) => (
        createAction(RequestsActionsTypes.GET_REQUESTS_STATUS_FAILED, {
            request,
            error,
        })
    ),
};

export type RequestsActions = ActionUnion<typeof requestsActions>;

const core = getCore();

export function getRequestsAsync(query?: RequestsQuery): ThunkAction {
    return async (dispatch, getState): Promise<void> => {
        dispatch(requestsActions.getRequests());

        // const filteredQuery = filterNull(query || getState().models.query);
        try {
            const result = await core.requests.list();
            const { requests, count } = result;
            requests
                .filter((request: Request) => [RQStatus.QUEUED, RQStatus.STARTED].includes(request.status))
                .forEach((request: Request): void => {
                    const { rqID } = request;
                    core.requests
                        .listen(rqID, (status: RQStatus, progress: number, message: string) => {
                            request.updateStatus(status, progress, message);
                            if (status === RQStatus.FAILED || status === RQStatus.UNKNOWN) {
                                dispatch(
                                    requestsActions.getRequestStatusFailed(
                                        request,
                                        new Error(`Request status for the job ${rqID} is ${status}. ${message}`),
                                    ),
                                );

                                return;
                            }

                            dispatch(
                                requestsActions.getRequestStatusSuccess(request),
                            );
                        })
                        .catch((error: Error) => {
                            request.updateStatus(RQStatus.UNKNOWN, 0, '');
                            dispatch(
                                requestsActions.getRequestStatusFailed(request, error),
                            );
                        });
                });
            dispatch(requestsActions.getRequestsSuccess(requests, count));
        } catch (error) {
            dispatch(requestsActions.getRequestsFailed(error));
        }
    };
}
