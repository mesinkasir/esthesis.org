---
title: "Submissions"
description: "Submit articles to Esthesis using this form with your name, subject, email, website, message, and short bio so the editors can review your work for publication."
permalink: /submissions/
---

If you have an article you would like considered for Esthesis, please fill out and submit the following form:

<form class="submission-form" method="post" action="{{metadata.formspree_id}}">
  <p>
    <label for="name">Name</label><br>
    <input id="name" class="form-control" name="name" type="text" required>
  </p>
  <p>
    <label for="subject">Subject</label><br>
    <input id="subject" class="form-control" name="subject" type="text" required>
  </p>
  <p>
    <label for="email">Email</label><br>
    <input id="email" class="form-control" name="email" type="email" required>
  </p>
  <p>
    <label for="website">Website</label><br>
    <input id="website" class="form-control" name="website" type="url">
  </p>
  <p>
    <label for="message">Message</label><br>
    <textarea id="message" class="form-control" name="message" rows="6" required></textarea>
  </p>
  <p>
    <label for="bio">Short Bio</label><br>
    <textarea id="bio" class="form-control" name="bio" rows="4" required></textarea>
  </p>
  <p>
    <button type="submit" class="btn btn-dark col-12 col-md-3 ">Submit</button>
  </p>
</form>
