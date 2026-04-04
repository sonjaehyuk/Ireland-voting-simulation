# Ireland voting simulation

The goal of this project is to provide a web page that visualises the Irish electoral system and allows users to experience it (specifically the single transferable vote). It must be built as a static web application with a full client-side implementation using JavaScript, requiring no separate server.

## Management of election-related objects.

It should effectively represent the objects typically found in an election. This would include voters, candidates, ballot papers, and election rounds.

### Reference

Just for your information.

* https://www.electoralcommission.ie/irelands-voting-system/?utm_source=chatgpt.com

## Agreement of code

### Javascript

When writing JavaScript code, priority must be given to stability.
While constant refactoring is not strictly mandatory, care should be taken to identify whether duplicate or similar functions already exist. Every function must have documentation(JSDoc) in Korean.

### HTML & CSS

Try to avoid writing CSS from scratch if you can. Let's use the Bootstrap 5 library instead.

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
<script defer="" src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
```

## Version control

You must manage your code using git. If possible, avoid committing directly to the main branch. Instead, it's recommended to create a branch for your work. Furthermore, all commit messages must be written in Korean, and don't be afraid to include detailed information.
