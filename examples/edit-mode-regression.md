# Homebrewery Edit Mode Regression

The matched delimiter below should display as a **Note · Wide** label until it
is selected. Its closing delimiter should display as **End Note · Wide**.

{{note,wide
This content remains ordinary editable Markdown.
}}

\column

The line above should appear as a column divider.

\page

The line above should appear as **Page 2 starts**.

{{monster
## Nested Test

{{descriptive
The inner and outer labels should reveal independently.
}}
}}

The unfinished opener below must remain raw:

{{wide

The fenced example must also remain raw:

```markdown
{{wide
Example content
}}
\page
```
