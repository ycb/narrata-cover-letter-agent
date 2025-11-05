import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

export default function TabsDemo() {
  const [activeTab, setActiveTab] = useState('section-tzoid-3');
  const [solidColorTab, setSolidColorTab] = useState('all');

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Tzoid Tabs Demo - Lea Verou Technique</h1>
        
        <div className="tabs tabs-style-tzoid">
          <nav>
            <ul>
              <li className={activeTab === 'section-tzoid-1' ? 'tab-current' : ''}>
                <a 
                  href="#section-tzoid-1" 
                  className="icon icon-home"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('section-tzoid-1');
                  }}
                >
                  <span>Home</span>
                </a>
              </li>
              <li className={activeTab === 'section-tzoid-2' ? 'tab-current' : ''}>
                <a 
                  href="#section-tzoid-2" 
                  className="icon icon-box"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('section-tzoid-2');
                  }}
                >
                  <span>Archive</span>
                </a>
              </li>
              <li className={activeTab === 'section-tzoid-3' ? 'tab-current' : ''}>
                <a 
                  href="#section-tzoid-3" 
                  className="icon icon-upload"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('section-tzoid-3');
                  }}
                >
                  <span>Upload</span>
                </a>
              </li>
              <li className={activeTab === 'section-tzoid-4' ? 'tab-current' : ''}>
                <a 
                  href="#section-tzoid-4" 
                  className="icon icon-display"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('section-tzoid-4');
                  }}
                >
                  <span>Analytics</span>
                </a>
              </li>
              <li className={activeTab === 'section-tzoid-5' ? 'tab-current' : ''}>
                <a 
                  href="#section-tzoid-5" 
                  className="icon icon-tools"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab('section-tzoid-5');
                  }}
                >
                  <span>Settings</span>
                </a>
              </li>
            </ul>
          </nav>
          <div className="content-wrap">
            <section 
              id="section-tzoid-1" 
              className={activeTab === 'section-tzoid-1' ? 'content-current' : ''}
            >
              <p>1</p>
            </section>
            <section 
              id="section-tzoid-2"
              className={activeTab === 'section-tzoid-2' ? 'content-current' : ''}
            >
              <p>2</p>
            </section>
            <section 
              id="section-tzoid-3" 
              className={activeTab === 'section-tzoid-3' ? 'content-current' : ''}
            >
              <p>3</p>
            </section>
            <section 
              id="section-tzoid-4"
              className={activeTab === 'section-tzoid-4' ? 'content-current' : ''}
            >
              <p>4</p>
            </section>
            <section 
              id="section-tzoid-5"
              className={activeTab === 'section-tzoid-5' ? 'content-current' : ''}
            >
              <p>5</p>
            </section>
          </div>
        </div>

        <style>{`
          /* CSS Reset */
          article,aside,details,figcaption,figure,footer,header,hgroup,main,nav,section,summary {
            display: block;
          }

          audio,canvas,video {
            display: inline-block;
          }

          audio:not([controls]) {
            display: none;
            height: 0;
          }

          [hidden] {
            display: none;
          }

          html {
            font-family: sans-serif;
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
          }

          body {
            margin: 0;
          }

          a:focus {
            outline: thin dotted;
          }

          a:active,a:hover {
            outline: 0;
          }

          h1 {
            font-size: 2em;
            margin: 0.67em 0;
          }

          abbr[title] {
            border-bottom: 1px dotted;
          }

          b,strong {
            font-weight: bold;
          }

          dfn {
            font-style: italic;
          }

          hr {
            -moz-box-sizing: content-box;
            box-sizing: content-box;
            height: 0;
          }

          mark {
            background: #ff0;
            color: #000;
          }

          code,kbd,pre,samp {
            font-family: monospace,serif;
            font-size: 1em;
          }

          pre {
            white-space: pre-wrap;
          }

          q {
            quotes: "\\201C" "\\201D" "\\2018" "\\2019";
          }

          small {
            font-size: 80%;
          }

          sub,sup {
            font-size: 75%;
            line-height: 0;
            position: relative;
            vertical-align: baseline;
          }

          sup {
            top: -0.5em;
          }

          sub {
            bottom: -0.25em;
          }

          img {
            border: 0;
          }

          svg:not(:root) {
            overflow: hidden;
          }

          figure {
            margin: 0;
          }

          fieldset {
            border: 1px solid #c0c0c0;
            margin: 0 2px;
            padding: 0.35em 0.625em 0.75em;
          }

          legend {
            border: 0;
            padding: 0;
          }

          button,input,select,textarea {
            font-family: inherit;
            font-size: 100%;
            margin: 0;
          }

          button,input {
            line-height: normal;
          }

          button,select {
            text-transform: none;
          }

          button,html input[type="button"],input[type="reset"],input[type="submit"] {
            -webkit-appearance: button;
            cursor: pointer;
          }

          button[disabled],html input[disabled] {
            cursor: default;
          }

          input[type="checkbox"],input[type="radio"] {
            box-sizing: border-box;
            padding: 0;
          }

          input[type="search"] {
            -webkit-appearance: textfield;
            -moz-box-sizing: content-box;
            -webkit-box-sizing: content-box;
            box-sizing: content-box;
          }

          input[type="search"]::-webkit-search-cancel-button,input[type="search"]::-webkit-search-decoration {
            -webkit-appearance: none;
          }

          button::-moz-focus-inner,input::-moz-focus-inner {
            border: 0;
            padding: 0;
          }

          textarea {
            overflow: auto;
            vertical-align: top;
          }

          table {
            border-collapse: collapse;
            border-spacing: 0;
          }

          @import url(//fonts.googleapis.com/css?family=Raleway:400,500,700);

          @font-face {
            font-weight: normal;
            font-style: normal;
            font-family: 'codropsicons';
            src:url('../fonts/codropsicons/codropsicons.eot');
            src:url('../fonts/codropsicons/codropsicons.eot?#iefix') format('embedded-opentype'),
              url('../fonts/codropsicons/codropsicons.woff') format('woff'),
              url('../fonts/codropsicons/codropsicons.ttf') format('truetype'),
              url('../fonts/codropsicons/codropsicons.svg#codropsicons') format('svg');
          }

          *, *:after, *:before { -webkit-box-sizing: border-box; box-sizing: border-box; }
          .clearfix:before, .clearfix:after { content: ''; display: table; }
          .clearfix:after { clear: both; }

          body {
            background: #e7ecea;
            color: #74777b;
            font-weight: 400;
            font-size: 1em;
            font-family: 'Raleway', Arial, sans-serif;
          }

          a {
            color: #2CC185;
            text-decoration: none;
            outline: none;
          }

          a:hover, a:focus {
            color: #74777b;
          }

          .support {
            display: none;
            color: #ef5189;
            text-align: left;
            font-size: 1.5em;
            max-width: 1200px;
            margin: 1em auto 0;
            padding: 0;
          }

          .no-flexbox .support {
            display: block;
          }

          .hidden {
            position: absolute;
            width: 0;
            height: 0;
            overflow: hidden;
            opacity: 0;
          }

          .container > section {
            padding: 5em 0;
            font-size: 1.25em;
            min-height: 100%;
          }

          p {
            text-align: center;
            padding: 1em;
          }

          /* Header */
          .codrops-header {
            padding: 7em 0 3em;
            letter-spacing: -1px;
          }

          .codrops-header h1 {
            max-width: 1200px;
            margin: 0 auto;
            font-weight: 800;
            font-size: 5em;
            line-height: 1;
          }

          .codrops-header h1 span {
            display: block;
            font-size: 50%;
            font-weight: 400;
            padding-top: 0.325em;
            color: #bdc2c9;
          }

          /* To Navigation Style */
          .codrops-top {
            width: 100%;
            text-transform: uppercase;
            font-weight: 700;
            font-size: 0.69em;
            line-height: 2.2;
          }

          .codrops-top a {
            display: inline-block;
            padding: 1em 2em;
            text-decoration: none;
            letter-spacing: 1px;
          }

          .codrops-top span.right {
            float: right;
          }

          .codrops-top span.right a {
            display: block;
            float: left;
          }

          .codrops-icon:before {
            margin: 0 4px;
            text-transform: none;
            font-weight: normal;
            font-style: normal;
            font-variant: normal;
            font-family: 'codropsicons';
            line-height: 1;
            speak: none;
            -webkit-font-smoothing: antialiased;
          }

          .codrops-icon-drop:before {
            content: "\\e001";
          }

          .codrops-icon-prev:before {
            content: "\\e004";
          }

          /* Related demos */
          .related {
            text-align: center;
          }

          .related > a {
            width: calc(100% - 20px);
            max-width: 340px;
            border: 1px solid black;
            border-color: initial;
            display: inline-block;
            text-align: center;
            margin: 20px 10px;
            padding: 25px;
          }

          .related a img {
            max-width: 100%;
            opacity: 0.8;
          }

          .related a:hover img,
          .related a:active img {
            opacity: 1;
          }

          .related a h3 {
            margin: 0;
            padding: 0.5em 0 0.3em;
            max-width: 300px;
            text-align: left;
          }

          body #cdawrap {
            top: 50px;
            right: 25px;
          }

          @media screen and (max-width: 1280px) {
            .codrops-header h1 {
              padding: 0 0.5em;
            }
            .support {
              padding: 0 1.5em;
            }
          }

          @media screen and (max-width: 30em) {
            .container > section {
              padding: 3em 0;
            }
            .codrops-header {
              padding: 2em 0 1em;
            }
            .codrops-header h1 {
              font-size: 3.5em;
            }
          }

          @media screen and (max-width: 25em) {
            .codrops-icon {
              font-size: 1.5em;
            }
            .codrops-icon span {
              display: none;
            }
          }

          /* Default tab style */
          @font-face {
            font-weight: normal;
            font-style: normal;
            font-family: 'stroke7pixeden';
            src:url('../fonts/stroke7pixeden/stroke7pixeden.eot?u58ytb');
            src:url('../fonts/stroke7pixeden/stroke7pixeden.eot?#iefixu58ytb') format('embedded-opentype'),
              url('../fonts/stroke7pixeden/stroke7pixeden.woff?u58ytb') format('woff'),
              url('../fonts/stroke7pixeden/stroke7pixeden.ttf?u58ytb') format('truetype'),
              url('../fonts/stroke7pixeden/stroke7pixeden.svg?u58ytb#stroke7pixeden') format('svg');
          }

          .tabs {
            position: relative;
            overflow: hidden;
            margin: 0 auto;
            width: 100%;
            font-weight: 300;
            font-size: 1.25em;
          }

          /* Nav */
          .tabs nav {
            text-align: center;
          }

          .tabs nav ul {
            position: relative;
            display: -ms-flexbox;
            display: -webkit-flex;
            display: -moz-flex;
            display: -ms-flex;
            display: flex;
            margin: 0 auto;
            padding: 0;
            max-width: 1200px;
            list-style: none;
            -ms-box-orient: horizontal;
            -ms-box-pack: center;
            -webkit-flex-flow: row wrap;
            -moz-flex-flow: row wrap;
            -ms-flex-flow: row wrap;
            flex-flow: row wrap;
            -webkit-justify-content: center;
            -moz-justify-content: center;
            -ms-justify-content: center;
            justify-content: center;
          }

          .tabs nav ul li {
            position: relative;
            z-index: 1;
            display: block;
            margin: 0;
            text-align: center;
            -webkit-flex: 1;
            -moz-flex: 1;
            -ms-flex: 1;
            flex: 1;
          }

          .tabs nav a {
            position: relative;
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            line-height: 2.5;
          }

          .tabs nav a span {
            vertical-align: middle;
            font-size: 0.75em;
          }

          .tabs nav li.tab-current a {
            color: #74777b;
          }

          .tabs nav a:focus {
            outline: none;
          }

          /* Icons */
          .icon::before {
            z-index: 10;
            display: inline-block;
            margin: 0 0.4em 0 0;
            vertical-align: middle;
            text-transform: none;
            font-weight: normal;
            font-variant: normal;
            font-size: 1.3em;
            font-family: 'stroke7pixeden';
            line-height: 1;
            speak: none;
            -webkit-backface-visibility: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .icon-upload::before {
            content: "\\e68a";
          }

          .icon-tools::before {
            content: "\\e60a";
          }

          .icon-plane::before {
            content: "\\e625";
          }

          .icon-joy::before {
            content: "\\e6a4";
          }

          .icon-plug::before {
            content: "\\e69a";
          }

          .icon-home::before {
            content: "\\e648";
          }

          .icon-gift::before {
            content: "\\e652";
          }

          .icon-display::before {
            content: "\\e65e";
          }

          .icon-date::before {
            content: "\\e660";
          }

          .icon-config::before {
            content: "\\e666";
          }

          .icon-coffee::before {
            content: "\\e669";
          }

          .icon-camera::before {
            content: "\\e66f";
          }

          .icon-box::before {
            content: "\\e674";
          }

          /* Content */
          .content-wrap {
            position: relative;
          }

          .content-wrap section {
            display: none;
            margin: 0 auto;
            padding: 1em;
            max-width: 1200px;
            text-align: center;
          }

          .content-wrap section.content-current {
            display: block;
          }

          .content-wrap section p {
            margin: 0;
            padding: 0.75em 0;
            color: rgba(40,44,42,0.05);
            font-weight: 900;
            font-size: 4em;
            line-height: 1;
          }

          /* Fallback */
          .no-js .content-wrap section {
            display: block;
            padding-bottom: 2em;
            border-bottom: 1px solid rgba(255,255,255,0.6);
          }

          .no-flexbox nav ul {
            display: block;
          }

          .no-flexbox nav ul li {
            min-width: 15%;
            display: inline-block;
          }

          @media screen and (max-width: 58em) {
            .tabs nav a.icon span {
              display: none;
            }
            .tabs nav a:before {
              margin-right: 0;
            }
          }

          /*****************************/
          /* Trapezoid, based on http://lea.verou.me/2013/10/slanted-tabs-with-css-3d-transforms/ */
          /*****************************/ 
          .tabs-style-tzoid {
            max-width: 1200px;
          }
          
          .tabs-style-tzoid nav {
            padding: 0 1em;
          }
          
          .tabs-style-tzoid nav ul {
            display: flex;
            list-style: none;
            margin: 0;
            padding: 0;
          }
          
          .tabs-style-tzoid nav ul li {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          .tabs-style-tzoid nav ul li a {
            padding: 0 1.5em 0 0.3em;
            color: #0d9564;
            -webkit-transition: color 0.2s;
            transition: color 0.2s;
            position: relative;
            display: block;
            text-decoration: none;
          }
          
          @media screen and (max-width: 54em) {
            .tabs-style-tzoid nav ul li a {
              padding: 0 0.5em 0 0.3em;
            }
          }
          
          .tabs-style-tzoid nav ul li a:hover,
          .tabs-style-tzoid nav ul li a:focus {
            color: #fff;
          }
          
          .tabs-style-tzoid nav ul li.tab-current a,
          .tabs-style-tzoid nav ul li.tab-current a:hover {
            color: #2CC185;
          }
          
          .tabs-style-tzoid nav ul li a span {
            font-weight: 500;
            font-size: 0.75em;
          }
          
          .tabs-style-tzoid nav ul li a::after {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            z-index: -1;
            outline: 1px solid transparent;
            border-radius: 10px 10px 0 0;
            background: #2CC185;
            box-shadow: inset 0 -3px 3px rgba(0,0,0,0.05);
            content: '';
            -webkit-transform: perspective(5px) rotateX(0.93deg) translateZ(-1px);
            transform: perspective(5px) rotateX(0.93deg) translateZ(-1px);
            -webkit-transform-origin: 0 0;
            transform-origin: 0 0;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          .tabs-style-tzoid nav ul li.tab-current a::after,
          .tabs-style-tzoid .content-wrap {
            background: #fff;
            box-shadow: none;
          }
          
        `}</style>

        {/* Solid Color Tabs Implementation */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-4">Solid Color Tabs (No Borders)</h2>
          <p className="text-muted-foreground mb-8">
            Using Radix UI Tabs with solid background colors to create unified highlighted region.
          </p>
          
          <Card className="shadow-soft overflow-visible border-0 bg-muted">
            <style>{`
              .solid-color-tabs {
                position: relative;
              }
              
              /* Remove all default borders from TabsList */
              .solid-color-tabs [role="tablist"] {
                border: none;
                background: hsl(var(--muted));
                display: flex;
                gap: 0.5rem;
                padding: 0;
                margin: 0;
              }
              
              /* Override default TabsTrigger styles */
              .solid-color-tabs button[role="tab"] {
                border: none;
                border-bottom: none;
                font-size: 1.5rem;
              }
              
              /* Inactive tabs - muted background */
              .solid-color-tabs button[role="tab"][data-state="inactive"] {
                background: hsl(var(--muted));
                color: hsl(var(--muted-foreground));
                border-radius: calc(var(--radius) * 0.75) calc(var(--radius) * 0.75) 0 0;
                padding: 0.75em 1.5em;
                font-weight: 500;
                font-family: inherit;
                transition: all 0.2s;
                border: none;
              }
              
              /* Pink for hover on inactive tabs */
              .solid-color-tabs button[role="tab"][data-state="inactive"]:hover {
                color: hsl(330 85% 60%);
                background: hsl(var(--muted));
              }
              
              /* Active tab - Selection State: Bold + Highlight + Lines */
              .solid-color-tabs button[role="tab"][data-state="active"] {
                background: hsl(var(--card));
                color: hsl(var(--accent));
                border-radius: calc(var(--radius) * 0.75) calc(var(--radius) * 0.75) 0 0;
                padding: 0.75em 1.5em;
                font-weight: 700;
                font-family: inherit;
                position: relative;
                z-index: 10;
                border: none;
                /* Lines: text underline for selection indicator */
                text-decoration: underline;
                text-decoration-color: hsl(var(--accent));
                text-decoration-thickness: 3px;
                text-underline-offset: 0.5em;
              }
              
              /* Content area - white/card background matching active tab */
              .solid-color-tabs-content {
                background: hsl(var(--card));
                border: none;
                border-radius: 0 0 var(--radius) var(--radius);
                padding: 2em;
                min-height: 200px;
                margin-top: 0;
              }
              
              /* Focus ring styling for accessibility */
              .solid-color-tabs [role="tab"]:focus-visible {
                outline: 2px solid hsl(var(--accent));
                outline-offset: 2px;
              }
            `}</style>
            
            <div className="solid-color-tabs">
              <Tabs value={solidColorTab} onValueChange={setSolidColorTab}>
                <TabsList className="w-full p-0 h-auto -mt-4 border-0 bg-muted">
                  <TabsTrigger value="all" className="rounded-t-lg rounded-b-none border-0">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="workHistory" className="rounded-t-lg rounded-b-none border-0">
                    Work History
                  </TabsTrigger>
                  <TabsTrigger value="savedSections" className="rounded-t-lg rounded-b-none border-0">
                    Saved Sections
                  </TabsTrigger>
                  <TabsTrigger value="coverLetters" className="rounded-t-lg rounded-b-none border-0">
                    Cover Letters
                  </TabsTrigger>
                </TabsList>
                
                <CardContent className="solid-color-tabs-content">
                  <TabsContent value="all" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">All Content Items</h3>
                      <p className="text-muted-foreground">
                        This is the unified content area that matches the active tab's white background.
                        No borders - just solid colors creating visual separation.
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded">Item 1</div>
                        <div className="p-4 bg-muted rounded">Item 2</div>
                        <div className="p-4 bg-muted rounded">Item 3</div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="workHistory" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Work History</h3>
                      <p className="text-muted-foreground">
                        Active tab and content area share the same white background (#fff),
                        creating a unified highlighted region.
                      </p>
                      <ul className="space-y-2">
                        <li className="p-2 bg-muted rounded">PM @ Acme: Role Summary</li>
                        <li className="p-2 bg-muted rounded">PM @ Acme: Summary Metrics</li>
                        <li className="p-2 bg-muted rounded">PM @ Acme: Improved Sales Messaging</li>
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="savedSections" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Cover Letter Saved Sections</h3>
                      <p className="text-muted-foreground">
                        Inactive tabs have green background (#2CC185) with darker text (#0d9564).
                        Visual separation achieved through color contrast, not borders.
                      </p>
                      <ul className="space-y-2">
                        <li className="p-2 bg-muted rounded">Cover Letter - Introduction</li>
                        <li className="p-2 bg-muted rounded">Cover Letter - Experience</li>
                        <li className="p-2 bg-muted rounded">Cover Letter - Closing</li>
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="coverLetters" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Cover Letters</h3>
                      <p className="text-muted-foreground">
                        This implementation uses simple CSS with solid colors.
                        No complex 3D transforms or border tricks needed.
                      </p>
                      <div className="p-4 bg-muted rounded">
                        <p>Cover letter content would go here...</p>
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

