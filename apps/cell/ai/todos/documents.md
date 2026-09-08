# Document Builder Follow-ups

- Add a `signature` field type to document-owned form packages and document content. A signature field must support an open signer mode, where an authorized user is assigned or requested later, and an assigned-signer mode, where the designer selects a user who has permission to sign documents.
- Define signer permissions and server-side authorization for signature fields and signing requests; selecting a user in the editor must not bypass those checks.
- Preserve signature-field configuration in immutable template revisions and carry signer assignments into generated document workflows without treating signatures as ordinary form values.
- Add future signing-request state, audit history, and rendered signature evidence so a document can remain pending until every required signature is complete.
- Add an optional user setting to save a reusable signature for users with the required signing permission, then autofill that signature only when the signer explicitly permits reuse and the document workflow allows it.
- Keep reusable signatures protected as sensitive identity data with revocation, replacement, and audit behavior; never expose them to users without the relevant signing permission.
