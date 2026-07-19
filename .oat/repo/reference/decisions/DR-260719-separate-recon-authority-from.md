---
id: DR-260719-separate-recon-authority-from
title: Separate recon authority from model floors
date: 2026-07-19
status: accepted
legacy_id: null
---

# Separate recon authority from model floors

## Context

Reviewer-local reconnaissance needs read-only advisory authority, but different lanes carry different ambiguity, silent-miss risk, and failure consequences.

## Decision

Keep role.class: recon as the authority boundary and represent required worker capability independently through task_class and model_class_floor.

## Consequences

Mechanical lanes can remain economical while semantic or consequential lanes require stronger capability; dispatch records must preserve both axes and mixed floors cannot be flattened into one wave.
