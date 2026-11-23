/*
 * Captured compile fixture: real Fumadocs output for `all-fences.md`. Do not
 * edit or reformat it; recapture it instead. Root `.oxfmtrc.jsonc`, the
 * package oxlint `--ignore-pattern` and the tsconfig exclusion all skip
 * this `__fixtures__` directory, so every byte after this header is the capture
 * command's stdout, unmodified.
 *
 * Captured 2026-11-21 with @mdx-js/mdx 3.1.1, fumadocs-mdx 14.3.2 and
 * fumadocs-core 16.10.2 (Node v26.11.1). The source page is compiled the way
 * fumadocs-mdx compiles a `.md` page: `format: 'md'` plus `applyMdxPreset`
 * over the shared docs-config remark chain, in `'runtime'` mode, which emits
 * a function body (`compile` → `run`). The vfile path is
 * `<package>/docs/all-fences.md`, so `remarkLinks` resolves the `.md` link
 * against a `docs/` content root.
 *
 * Capture command, run from `packages/docs-theme` after building
 * docs-transforms and docs-config, then prepend this header:
 *
 * node --input-type=module -e "import {readFileSync} from 'node:fs'; import {resolve} from 'node:path'; import {compile} from '@mdx-js/mdx'; import {applyMdxPreset} from 'fumadocs-mdx/config'; import {createSourceConfig} from '@open-agent-toolkit/docs-config'; const value = readFileSync('src/figures/__fixtures__/all-fences.md', 'utf8'); const options = await applyMdxPreset({ remarkPlugins: createSourceConfig().remarkPlugins })('runtime'); process.stdout.write(String(await compile({ value, path: resolve('docs/all-fences.md') }, { format: 'md', ...options })));" > body.js
 */
"use strict";
const {Fragment: _Fragment, jsx: _jsx, jsxs: _jsxs} = arguments[0];
let structuredData = {
  "contents": [{
    "heading": "all-figure-fences",
    "content": "This page is the source of the captured compile fixture\n`all-fences.compiled.js`. It holds one realistic example of each `docs-*`\nfigure fence."
  }, {
    "heading": "steps",
    "content": "Install the packages — add the docs packages to the app."
  }, {
    "heading": "steps",
    "content": "**Register the components (current)** — wrap the MDX map with `withDocsFigures`."
  }, {
    "heading": "steps",
    "content": "*Write a figure (next)* — add a `docs-tree` fence to a page."
  }, {
    "heading": "tree",
    "content": ".oat/"
  }, {
    "heading": "tree",
    "content": "projects/"
  }, {
    "heading": "tree",
    "content": "shared/"
  }, {
    "heading": "tree",
    "content": "**mdxcn/ — the active project**"
  }, {
    "heading": "tree",
    "content": "plan.md — task plan"
  }, {
    "heading": "tree",
    "content": "state.md"
  }, {
    "heading": "tree",
    "content": "repo/"
  }, {
    "heading": "tree",
    "content": "The bold node is the active project."
  }, {
    "heading": "timeline",
    "content": "seed: captured in the scratchpad"
  }, {
    "heading": "timeline",
    "content": "**brainstorming: actively being explored (current)**"
  }, {
    "heading": "timeline",
    "content": "*summarized: finalized with a summary (next)*"
  }, {
    "heading": "decision",
    "content": "**Postgres (chosen)** — we already run it"
  }, {
    "heading": "decision",
    "content": "*MongoDB (rejected)* — no schema guarantees"
  }, {
    "heading": "decision",
    "content": "SQLite — still open for local tools"
  }, {
    "heading": "decision",
    "content": "The service keeps its existing connection pool. See the\nstorage guide for the migration."
  }, {
    "heading": "check",
    "content": "Tests pass — on the merged tree"
  }, {
    "heading": "check",
    "content": "Docs updated — scaffold and OAT pages"
  }, {
    "heading": "check",
    "content": "Markdown Features page"
  }, {
    "heading": "check",
    "content": "Scaffold contributing page"
  }, {
    "heading": "compare",
    "content": "Feature"
  }, {
    "heading": "compare",
    "content": "Fence"
  }, {
    "heading": "compare",
    "content": "MDX component"
  }, {
    "heading": "compare",
    "content": "Plain Markdown"
  }, {
    "heading": "compare",
    "content": "yes"
  }, {
    "heading": "compare",
    "content": "no"
  }, {
    "heading": "compare",
    "content": "Renders on GitHub"
  }, {
    "heading": "compare",
    "content": "✓"
  }, {
    "heading": "compare",
    "content": "–"
  }, {
    "heading": "compare",
    "content": "Needs imports"
  }, {
    "heading": "compare",
    "content": "no"
  }, {
    "heading": "compare",
    "content": "yes"
  }, {
    "heading": "annotate",
    "content": "The shared chain already includes the fence transform."
  }, {
    "heading": "annotate",
    "content": "Pass `appRoot` when the app is not the working directory."
  }],
  "headings": [{
    "id": "all-figure-fences",
    "content": "All figure fences"
  }, {
    "id": "steps",
    "content": "Steps"
  }, {
    "id": "tree",
    "content": "Tree"
  }, {
    "id": "timeline",
    "content": "Timeline"
  }, {
    "id": "terminal",
    "content": "Terminal"
  }, {
    "id": "decision",
    "content": "Decision"
  }, {
    "id": "check",
    "content": "Check"
  }, {
    "id": "compare",
    "content": "Compare"
  }, {
    "id": "annotate",
    "content": "Annotate"
  }]
};
let toc = [{
  depth: 1,
  url: "#all-figure-fences",
  title: _jsx(_Fragment, {
    children: "All figure fences"
  })
}, {
  depth: 2,
  url: "#steps",
  title: _jsx(_Fragment, {
    children: "Steps"
  })
}, {
  depth: 2,
  url: "#tree",
  title: _jsx(_Fragment, {
    children: "Tree"
  })
}, {
  depth: 2,
  url: "#timeline",
  title: _jsx(_Fragment, {
    children: "Timeline"
  })
}, {
  depth: 2,
  url: "#terminal",
  title: _jsx(_Fragment, {
    children: "Terminal"
  })
}, {
  depth: 2,
  url: "#decision",
  title: _jsx(_Fragment, {
    children: "Decision"
  })
}, {
  depth: 2,
  url: "#check",
  title: _jsx(_Fragment, {
    children: "Check"
  })
}, {
  depth: 2,
  url: "#compare",
  title: _jsx(_Fragment, {
    children: "Compare"
  })
}, {
  depth: 2,
  url: "#annotate",
  title: _jsx(_Fragment, {
    children: "Annotate"
  })
}];
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    em: "em",
    h1: "h1",
    h2: "h2",
    input: "input",
    li: "li",
    ol: "ol",
    p: "p",
    pre: "pre",
    span: "span",
    strong: "strong",
    table: "table",
    tbody: "tbody",
    td: "td",
    th: "th",
    thead: "thead",
    tr: "tr",
    ul: "ul",
    ...props.components
  }, {DocsAnnotate, DocsCheck, DocsCompare, DocsDecision, DocsSteps, DocsTerminal, DocsTimeline, DocsTree, Tab, Tabs} = _components;
  if (!DocsAnnotate) _missingMdxReference("DocsAnnotate", true);
  if (!DocsCheck) _missingMdxReference("DocsCheck", true);
  if (!DocsCompare) _missingMdxReference("DocsCompare", true);
  if (!DocsDecision) _missingMdxReference("DocsDecision", true);
  if (!DocsSteps) _missingMdxReference("DocsSteps", true);
  if (!DocsTerminal) _missingMdxReference("DocsTerminal", true);
  if (!DocsTimeline) _missingMdxReference("DocsTimeline", true);
  if (!DocsTree) _missingMdxReference("DocsTree", true);
  if (!Tab) _missingMdxReference("Tab", true);
  if (!Tabs) _missingMdxReference("Tabs", true);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      id: "all-figure-fences",
      children: "All figure fences"
    }), "\n", _jsxs(_components.p, {
      children: ["This page is the source of the captured compile fixture\n", _jsx(_components.code, {
        children: "all-fences.compiled.js"
      }), ". It holds one realistic example of each ", _jsx(_components.code, {
        children: "docs-*"
      }), "\nfigure fence."]
    }), "\n", _jsx(_components.h2, {
      id: "steps",
      children: "Steps"
    }), "\n", _jsx(DocsSteps, {
      title: "Set up figures",
      children: _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Install the packages — add the docs packages to the app."
        }), "\n", _jsxs(_components.li, {
          children: [_jsx(_components.strong, {
            children: "Register the components (current)"
          }), " — wrap the MDX map with ", _jsx(_components.code, {
            children: "withDocsFigures"
          }), "."]
        }), "\n", _jsxs(_components.li, {
          children: [_jsx(_components.em, {
            children: "Write a figure (next)"
          }), " — add a ", _jsx(_components.code, {
            children: "docs-tree"
          }), " fence to a page."]
        }), "\n"]
      })
    }), "\n", _jsx(_components.h2, {
      id: "tree",
      children: "Tree"
    }), "\n", _jsxs(Tabs, {
      children: [_jsx(Tab, {
        title: "Layout",
        children: _jsx(DocsTree, {
          title: "Project level",
          children: _jsxs(_components.ul, {
            children: ["\n", _jsxs(_components.li, {
              children: [".oat/", "\n", _jsxs(_components.ul, {
                children: ["\n", _jsxs(_components.li, {
                  children: ["projects/", "\n", _jsxs(_components.ul, {
                    children: ["\n", _jsxs(_components.li, {
                      children: ["shared/", "\n", _jsxs(_components.ul, {
                        children: ["\n", _jsxs(_components.li, {
                          children: [_jsx(_components.strong, {
                            children: "mdxcn/ — the active project"
                          }), "\n", _jsxs(_components.ul, {
                            children: ["\n", _jsx(_components.li, {
                              children: "plan.md — task plan"
                            }), "\n", _jsx(_components.li, {
                              children: "state.md"
                            }), "\n"]
                          }), "\n"]
                        }), "\n"]
                      }), "\n"]
                    }), "\n"]
                  }), "\n"]
                }), "\n", _jsx(_components.li, {
                  children: "repo/"
                }), "\n"]
              }), "\n"]
            }), "\n"]
          })
        })
      }), _jsx(Tab, {
        title: "Notes",
        children: _jsx(_components.p, {
          children: "The bold node is the active project."
        })
      })]
    }), "\n", _jsx(_components.h2, {
      id: "timeline",
      children: "Timeline"
    }), "\n", _jsx(DocsTimeline, {
      title: "Idea lifecycle",
      children: _jsxs(_components.ul, {
        children: ["\n", _jsx(_components.li, {
          children: "seed: captured in the scratchpad"
        }), "\n", _jsx(_components.li, {
          children: _jsx(_components.strong, {
            children: "brainstorming: actively being explored (current)"
          })
        }), "\n", _jsx(_components.li, {
          children: _jsx(_components.em, {
            children: "summarized: finalized with a summary (next)"
          })
        }), "\n"]
      })
    }), "\n", _jsx(_components.h2, {
      id: "terminal",
      children: "Terminal"
    }), "\n", _jsx(DocsTerminal, {
      title: "Build",
      children: _jsx(_Fragment, {
        children: _jsx(_components.pre, {
          className: "shiki shiki-themes github-light github-dark",
          style: {
            "--shiki-light": "#24292e",
            "--shiki-dark": "#e1e4e8",
            "--shiki-light-bg": "#fff",
            "--shiki-dark-bg": "#24292e"
          },
          tabIndex: "0",
          icon: "<svg viewBox=\"0 0 24 24\"><path d=\"M 6,1 C 4.354992,1 3,2.354992 3,4 v 16 c 0,1.645008 1.354992,3 3,3 h 12 c 1.645008,0 3,-1.354992 3,-3 V 8 7 A 1.0001,1.0001 0 0 0 20.707031,6.2929687 l -5,-5 A 1.0001,1.0001 0 0 0 15,1 h -1 z m 0,2 h 7 v 3 c 0,1.645008 1.354992,3 3,3 h 3 v 11 c 0,0.564129 -0.435871,1 -1,1 H 6 C 5.4358712,21 5,20.564129 5,20 V 4 C 5,3.4358712 5.4358712,3 6,3 Z M 15,3.4140625 18.585937,7 H 16 C 15.435871,7 15,6.5641288 15,6 Z\" fill=\"currentColor\" /></svg>",
          children: _jsxs(_components.code, {
            children: [_jsx(_components.span, {
              className: "line",
              children: _jsx(_components.span, {
                children: "# Build the docs site"
              })
            }), "\n", _jsx(_components.span, {
              className: "line",
              children: _jsx(_components.span, {
                children: "$ pnpm build:docs"
              })
            }), "\n", _jsx(_components.span, {
              className: "line",
              children: _jsx(_components.span, {
                children: "Compiled 212 pages"
              })
            }), "\n", _jsx(_components.span, {
              className: "line",
              children: _jsx(_components.span, {
                children: "✓ static export written to out/"
              })
            })]
          })
        })
      })
    }), "\n", _jsx(_components.h2, {
      id: "decision",
      children: "Decision"
    }), "\n", _jsxs(DocsDecision, {
      title: "Storage",
      status: "accepted",
      date: "2026-11-21",
      children: [_jsxs(_components.ul, {
        children: ["\n", _jsxs(_components.li, {
          children: [_jsx(_components.strong, {
            children: "Postgres (chosen)"
          }), " — we already run it"]
        }), "\n", _jsxs(_components.li, {
          children: [_jsx(_components.em, {
            children: "MongoDB (rejected)"
          }), " — no schema guarantees"]
        }), "\n", _jsx(_components.li, {
          children: "SQLite — still open for local tools"
        }), "\n"]
      }), _jsxs(_components.p, {
        children: ["The service keeps its existing connection pool. See the\n", _jsx(_components.a, {
          href: "../guides/storage/",
          children: "storage guide"
        }), " for the migration."]
      })]
    }), "\n", _jsx(_components.h2, {
      id: "check",
      children: "Check"
    }), "\n", _jsx(DocsCheck, {
      title: "Release readiness",
      children: _jsxs(_components.ul, {
        className: "contains-task-list",
        children: ["\n", _jsxs(_components.li, {
          className: "task-list-item",
          children: [_jsx(_components.input, {
            type: "checkbox",
            checked: true,
            disabled: true
          }), " ", "Tests pass — on the merged tree"]
        }), "\n", _jsxs(_components.li, {
          className: "task-list-item",
          children: [_jsx(_components.input, {
            type: "checkbox",
            disabled: true
          }), " ", "Docs updated — scaffold and OAT pages", "\n", _jsxs(_components.ul, {
            className: "contains-task-list",
            children: ["\n", _jsxs(_components.li, {
              className: "task-list-item",
              children: [_jsx(_components.input, {
                type: "checkbox",
                checked: true,
                disabled: true
              }), " ", "Markdown Features page"]
            }), "\n", _jsxs(_components.li, {
              className: "task-list-item",
              children: [_jsx(_components.input, {
                type: "checkbox",
                disabled: true
              }), " ", "Scaffold contributing page"]
            }), "\n"]
          }), "\n"]
        }), "\n"]
      })
    }), "\n", _jsx(_components.h2, {
      id: "compare",
      children: "Compare"
    }), "\n", _jsx(DocsCompare, {
      title: "Figure options",
      accent: "Fence",
      children: _jsxs(_components.table, {
        children: [_jsx(_components.thead, {
          children: _jsxs(_components.tr, {
            children: [_jsx(_components.th, {
              children: "Feature"
            }), _jsx(_components.th, {
              children: "Fence"
            }), _jsx(_components.th, {
              children: "MDX component"
            })]
          })
        }), _jsxs(_components.tbody, {
          children: [_jsxs(_components.tr, {
            children: [_jsx(_components.td, {
              children: "Plain Markdown"
            }), _jsx(_components.td, {
              children: "yes"
            }), _jsx(_components.td, {
              children: "no"
            })]
          }), _jsxs(_components.tr, {
            children: [_jsx(_components.td, {
              children: "Renders on GitHub"
            }), _jsx(_components.td, {
              children: "✓"
            }), _jsx(_components.td, {
              children: "–"
            })]
          }), _jsxs(_components.tr, {
            children: [_jsx(_components.td, {
              children: "Needs imports"
            }), _jsx(_components.td, {
              children: "no"
            }), _jsx(_components.td, {
              children: "yes"
            })]
          })]
        })]
      })
    }), "\n", _jsx(_components.h2, {
      id: "annotate",
      children: "Annotate"
    }), "\n", _jsxs(DocsAnnotate, {
      title: "source.config.ts",
      children: [_jsx(_Fragment, {
        children: _jsx(_components.pre, {
          className: "shiki shiki-themes github-light github-dark",
          style: {
            "--shiki-light": "#24292e",
            "--shiki-dark": "#e1e4e8",
            "--shiki-light-bg": "#fff",
            "--shiki-dark-bg": "#24292e"
          },
          tabIndex: "0",
          icon: "<svg viewBox=\"0 0 24 24\"><path d=\"M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z\" fill=\"currentColor\" /></svg>",
          children: _jsxs(_components.code, {
            children: [_jsxs(_components.span, {
              className: "line",
              children: [_jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: "import"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#24292E",
                  "--shiki-dark": "#E1E4E8"
                },
                children: " { createSourceConfig } "
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: "from"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#032F62",
                  "--shiki-dark": "#9ECBFF"
                },
                children: " '@open-agent-toolkit/docs-config'"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#24292E",
                  "--shiki-dark": "#E1E4E8"
                },
                children: "; "
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#6A737D",
                  "--shiki-dark": "#6A737D"
                },
                children: "// (1)"
              })]
            }), "\n", _jsx(_components.span, {
              className: "line"
            }), "\n", _jsxs(_components.span, {
              className: "line",
              children: [_jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: "const"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#005CC5",
                  "--shiki-dark": "#79B8FF"
                },
                children: " config"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: " ="
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#6F42C1",
                  "--shiki-dark": "#B392F0"
                },
                children: " createSourceConfig"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#24292E",
                  "--shiki-dark": "#E1E4E8"
                },
                children: "(); "
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#6A737D",
                  "--shiki-dark": "#6A737D"
                },
                children: "// (2)"
              })]
            }), "\n", _jsxs(_components.span, {
              className: "line",
              children: [_jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: "export"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#D73A49",
                  "--shiki-dark": "#F97583"
                },
                children: " default"
              }), _jsx(_components.span, {
                style: {
                  "--shiki-light": "#24292E",
                  "--shiki-dark": "#E1E4E8"
                },
                children: " config;"
              })]
            })]
          })
        })
      }), _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "The shared chain already includes the fence transform."
        }), "\n", _jsxs(_components.li, {
          children: ["Pass ", _jsx(_components.code, {
            children: "appRoot"
          }), " when the app is not the working directory."]
        }), "\n"]
      })]
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
return {
  structuredData,
  toc,
  default: MDXContent
};
function _missingMdxReference(id, component) {
  throw new Error("Expected " + (component ? "component" : "object") + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}
