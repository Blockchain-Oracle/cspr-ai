'use client';

import * as React from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cn } from '@/components/utils';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Play, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

export type ProposalStatus =
  | 'active'
  | 'passed'
  | 'failed'
  | 'executed'
  | 'cancelled'
  | 'pending';

export interface DaoProposalData {
  contract_address: string;
  proposal_id: string;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  votes_for: string;
  votes_against: string;
  quorum: string;
  quorum_reached: boolean;
  start_time?: string;
  end_time: string;
  execution_time?: string;
  user_voting_power?: string;
  user_vote?: 'for' | 'against' | null;
}

export interface DaoProposalCardProps {
  proposal: DaoProposalData;
  isLoading?: boolean;
  onVoteFor?: () => void;
  onVoteAgainst?: () => void;
  onExecute?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export function DaoProposalCard({
  proposal,
  isLoading = false,
  onVoteFor,
  onVoteAgainst,
  onExecute,
  onViewDetails,
  compact = false,
  theme = 'dark',
}: DaoProposalCardProps) {

  const statusColors = {
      active: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      passed: "bg-green-500/10 text-green-500 border-green-500/20",
      failed: "bg-red-500/10 text-red-500 border-red-500/20",
      executed: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };

  const StatusIcon = {
      active: Clock,
      passed: CheckCircle,
      failed: XCircle,
      executed: Play,
      cancelled: XCircle,
      pending: Clock,
  }[proposal.status];

  // Calculate percentages
  const votesFor = parseFloat(proposal.votes_for.replace(/,/g, ''));
  const votesAgainst = parseFloat(proposal.votes_against.replace(/,/g, ''));
  const totalVotes = votesFor + votesAgainst;
  const percentFor = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
  
  // Quorum visualization (simplified)
  const quorumVal = parseFloat(proposal.quorum.replace(/,/g, ''));
  const quorumPercent = totalVotes > 0 ? Math.min((totalVotes / quorumVal) * 100, 100) : 0;

  return (
    <Card className={cn("w-full transition-all hover:border-primary/30", compact ? "p-3" : "p-5")} padding={compact ? 'none' : 'md'}>
        <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1", statusColors[proposal.status])}>
                        <StatusIcon className="h-3 w-3" />
                        {proposal.status}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">ID: {proposal.proposal_id}</span>
                </div>
                
                <h3 className={cn("font-bold leading-tight mb-1 truncate", compact ? "text-sm" : "text-lg")}>
                    {proposal.title}
                </h3>
                
                {!compact && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {proposal.description}
                    </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {compact ? (
                        <span>Ends: {new Date(proposal.end_time).toLocaleDateString()}</span>
                    ) : (
                         <div className="flex gap-4">
                             <span>By: {proposal.proposer.slice(0, 6)}...</span>
                             <span>Ends: {new Date(proposal.end_time).toLocaleString()}</span>
                         </div>
                    )}
                </div>
            </div>

            {/* Compact Voting Visual */}
            {compact && (
                <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                     {/* Mini donut chart placeholder */}
                     <div className="h-12 w-12 rounded-full border-4 border-muted border-t-green-500 border-r-green-500/50" />
                     <span className="absolute text-[10px] font-bold">{percentFor.toFixed(0)}%</span>
                </div>
            )}
        </div>

        {/* Full View Voting Visuals */}
        {!compact && (
            <div className="mt-5 space-y-4">
                {/* Voting Bars */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1 text-green-500"><ThumbsUp className="h-3 w-3" /> For ({proposal.votes_for})</span>
                        <span className="flex items-center gap-1 text-red-500">Against ({proposal.votes_against}) <ThumbsDown className="h-3 w-3" /></span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentFor}%` }} className="bg-green-500 h-full" />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${100 - percentFor}%` }} className="bg-red-500 h-full" />
                    </div>
                </div>

                {/* Quorum Progress */}
                <div className="space-y-1">
                     <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
                         <span>Quorum Progress</span>
                         <span>{proposal.quorum_reached ? "Reached" : "Not Reached"}</span>
                     </div>
                     <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${quorumPercent}%` }} 
                            className={cn("h-full", proposal.quorum_reached ? "bg-primary" : "bg-yellow-500")} 
                        />
                     </div>
                </div>

                {/* Actions */}
                {proposal.status === 'active' && (
                    <div className="flex gap-3 pt-2">
                        {onVoteFor && (
                             <Button size="sm" fullWidth className="bg-green-600 hover:bg-green-700 text-white" onClick={onVoteFor}>Vote For</Button>
                        )}
                        {onVoteAgainst && (
                             <Button size="sm" fullWidth className="bg-red-600 hover:bg-red-700 text-white" onClick={onVoteAgainst}>Vote Against</Button>
                        )}
                    </div>
                )}
                
                {proposal.status === 'passed' && onExecute && (
                    <Button size="sm" fullWidth variant="primary" onClick={onExecute}>Execute Proposal</Button>
                )}
            </div>
        )}
    </Card>
  );
}

export interface DaoProposalListProps {
  contractAddress: string;
  proposals: DaoProposalData[];
  isLoading?: boolean;
  onProposalClick?: (proposalId: string) => void;
  onCreateProposal?: () => void;
  theme?: 'light' | 'dark';
}

export function DaoProposalList({
  contractAddress,
  proposals,
  isLoading = false,
  onProposalClick,
  onCreateProposal,
  theme = 'dark',
}: DaoProposalListProps) {
  const [filter, setFilter] = React.useState<string>('all');

  const filtered = proposals.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex gap-2">
                {['all', 'active', 'passed', 'failed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors",
                            filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>
            {onCreateProposal && (
                <Button size="sm" variant="outline" onClick={onCreateProposal}>Create</Button>
            )}
        </div>

        <div className="space-y-3">
            {isLoading ? (
                <div className="space-y-3">
                     {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl text-muted-foreground">
                    No proposals found matching filter.
                </div>
            ) : (
                filtered.map(p => (
                    <div key={p.proposal_id} onClick={() => onProposalClick?.(p.proposal_id)} className="cursor-pointer">
                        <DaoProposalCard proposal={p} compact />
                    </div>
                ))
            )}
        </div>
    </div>
  );
}