// @vitest-environment jsdom
import React, {useState} from 'react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,act,cleanup} from '@testing-library/react';
const auth=vi.hoisted(()=>({isLoaded:true,isSignedIn:true,getToken:vi.fn(),signup:vi.fn()}));
vi.mock('@clerk/react',()=>({useAuth:()=>auth,useClerk:()=>({redirectToSignUp:auth.signup}),ClerkProvider:()=>null,UserButton:()=>null}));
import {SearchPanel} from '../src/main.jsx';
let fetchMock, widget, callbacks;
const response=(status,data)=>({status,ok:status===200,json:async()=>data});
const challenge=()=>response(403,{error:{code:'VERIFICATION_REQUIRED',message:'Verify'}});
const success=()=>response(200,{data:{verdict:'no_known_indicators',checked_at:new Date().toISOString(),findings:[]}});
function Harness(){const [mode,setMode]=useState('url');return <SearchPanel mode={mode} setMode={setMode}/>;}
const input=()=>screen.getByRole('textbox',{name:'URL / Link'});
const submit=()=>fireEvent.submit(document.querySelector('.scanner-form'));
const verify=()=>screen.getByRole('button',{name:'Verify and continue'});
const retry=()=>screen.getByRole('button',{name:'Retry verification'});
function start(){render(<Harness/>);fireEvent.change(input(),{target:{value:'https://example.org'}});}
async function required(){fetchMock.mockResolvedValueOnce(challenge());start();submit();await waitFor(()=>expect(widget.render).toHaveBeenCalledTimes(1));}
async function token(){await act(async()=>callbacks.callback('mock-token'));}
beforeEach(()=>{auth.isSignedIn=true;auth.getToken.mockReset().mockResolvedValue('mock-session');auth.signup.mockReset();vi.stubEnv('VITE_CYBERSCAN_API_URL','https://mock.invalid');vi.stubEnv('VITE_TURNSTILE_SITE_KEY','mock-site');fetchMock=vi.fn(()=>Promise.reject(new Error('Unexpected mock request')));vi.stubGlobal('fetch',fetchMock);widget={render:vi.fn((el,opts)=>{callbacks=opts;return 'widget-1';}),remove:vi.fn(),reset:vi.fn()};window.turnstile=widget;});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();delete window.turnstile;document.querySelectorAll('script[data-cyberscan-turnstile]').forEach(s=>s.remove());});
describe('SearchPanel isolated behaviour',()=>{
it('BEH-001 redirects signed-out user',()=>{auth.isSignedIn=false;start();submit();expect(auth.signup).toHaveBeenCalledTimes(1);expect(fetchMock).not.toHaveBeenCalled();});
it('BEH-002 submits authenticated URL',async()=>{fetchMock.mockResolvedValueOnce(success());start();submit();await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer mock-session');expect(JSON.parse(fetchMock.mock.calls[0][1].body).value).toBe('https://example.org');});
it('BEH-003 renders challenge',async()=>{await required();expect(callbacks.action).toBe('scan_url');expect(verify().disabled).toBe(true);});
it('BEH-004 blocks tokenless resubmission',async()=>{await required();submit();expect(fetchMock).toHaveBeenCalledTimes(1);});
it('BEH-005 sends verification token',async()=>{await required();await token();expect(verify().disabled).toBe(false);fetchMock.mockResolvedValueOnce(success());fireEvent.click(verify());await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));expect(JSON.parse(fetchMock.mock.calls[1][1].body).turnstileToken).toBe('mock-token');});
it('BEH-006 invalidates expired token',async()=>{await required();await token();await act(async()=>callbacks['expired-callback']());expect(verify().disabled).toBe(true);submit();expect(fetchMock).toHaveBeenCalledTimes(1);});
it('BEH-007 retries widget error',async()=>{await required();await act(async()=>callbacks['error-callback']());fireEvent.click(retry());expect(widget.remove).toHaveBeenCalled();expect(widget.render).toHaveBeenCalledTimes(2);});
it('BEH-008 removes widget on tab change',async()=>{await required();fireEvent.click(screen.getByRole('tab',{name:'Email address'}));expect(widget.remove).toHaveBeenCalledWith('widget-1');});
it('BEH-009 aborts outstanding request on edit',async()=>{fetchMock.mockImplementationOnce(()=>new Promise(()=>{}));start();submit();await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));fireEvent.change(input(),{target:{value:'https://example.net'}});expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);});
it('BEH-010 prevents duplicate requests',async()=>{fetchMock.mockImplementationOnce(()=>new Promise(()=>{}));start();submit();submit();await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));});
it('BEH-011 preserves request ID',async()=>{await required();await token();fetchMock.mockResolvedValueOnce(success());fireEvent.click(verify());await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));expect(JSON.parse(fetchMock.mock.calls[1][1].body).requestId).toBe(JSON.parse(fetchMock.mock.calls[0][1].body).requestId);});
it('BEH-012 recovers from script load failure',async()=>{delete window.turnstile;fetchMock.mockResolvedValueOnce(challenge());start();submit();await waitFor(()=>expect(document.querySelector('script[data-cyberscan-turnstile]')).not.toBeNull());fireEvent.error(document.querySelector('script[data-cyberscan-turnstile]'));expect(document.querySelector('script[data-cyberscan-turnstile]')).toBeNull();window.turnstile=widget;fireEvent.click(retry());expect(widget.render).toHaveBeenCalledTimes(1);});
it('BEH-013 times out widget initialization',async()=>{delete window.turnstile;fetchMock.mockResolvedValueOnce(challenge());start();vi.useFakeTimers();submit();await act(async()=>{await Promise.resolve();await Promise.resolve();});await act(async()=>{await vi.advanceTimersByTimeAsync(15001);});expect(retry()).toBeTruthy();});
it('BEH-014 renders successful result',async()=>{fetchMock.mockResolvedValueOnce(success());start();submit();expect(await screen.findByText('No known threat indicators from completed checks')).toBeTruthy();});
it('BEH-015 ignores stale response',async()=>{let resolve;fetchMock.mockImplementationOnce(()=>new Promise(r=>resolve=r));start();submit();await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));fireEvent.change(input(),{target:{value:'https://example.net'}});await act(async()=>resolve(success()));expect(screen.queryByText('No known threat indicators from completed checks')).toBeNull();});
});
