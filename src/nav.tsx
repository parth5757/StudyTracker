import {createContext, useContext} from 'react';
import {LogKind} from './types';

export type LogPrefill = {nodeId?: string | null; kind?: LogKind; minutes?: number; title?: string; slotId?: string};

export type Nav = {
  openNode: (id: string | null) => void;
  openLog: (prefill?: LogPrefill) => void;
  openTimer: (nodeId: string | null, slotId?: string) => void;
};

export const NavContext = createContext<Nav>({openNode: () => {}, openLog: () => {}, openTimer: () => {}});
export const useNav = () => useContext(NavContext);
