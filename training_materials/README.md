# SusTraIN-training-material-review
Repository of description files, for green compute training. 


## To add or edit a resource item document in the `training_materials` folder
- From this `training_materials` folder (which contains this README file) find the required sub-folder.
  (Each sub-folder represents a SusTraIN Green Compute domain group.)  
- Then either:
  - **To add a new file**:
    - Click the `Add File` button for that sub-folder, then select `Create new file`.
    - Enter the new file name (where it says "Name your file...") and include the `.json` extension.
  - **To propose edits to an existing file**:
    - Open the file within the sub-folder, then click the edit button (pencil icon, top-right).
- Add/update the yaml file in that large edit box. The sections below provide lists and descriptions of the available fields.
- Click on `Commit changes...`
- Fill out the required ('commit') fields in the edit box.
  - `Commit message`: a simple sentence that describes your update.
  - `Extended description`: (Optional) More details might help the person reviewing your commit to understand why you've done the update.
  - *Commit email*: GitHub sets this automatically when using the web editor; if you need to change it, update your email in GitHub Settings.
  - *Bottom edit box*: GitHub will make up a new branch name, you can use that, or make a more descriptive one. (No spaces, use hyphens between words). It's only a temporary branch whilst your updates are being reviewed, so no need to change.
- Then click on `Propose changes` and select a reviewer to review your changes.
- You may also need to click on a further green 'Create pull request' button.
- Your changes will be submitted as a Pull-Request (PR) and reviewed by one of the SuTraIN repository owners and either published if OK, or a response will be sent with feedback and/or edit suggestions. 


## YAML file format for each training materials item


(See also, the [original JSON for metadata schema](https://github.com/BioSchemas/specifications/blob/master/TrainingMaterial/examples/1.0-RELEASE/trainingMaterial.json) for the full set of field requirements in JSON format)

For each available field, a description is provided of what it should contain. 
Required fields are marked with "REQUIRED" in the description.

```yml

---
url: "REQUIRED. URL link to the resource"
identifier: "Unique identifier, e.g. URI or DOI link"
name: "REQUIRED. The name/title of the training resource"
description: "A description of the training resource"
abstract: "Abstract summarising the training resource."
educationalLevel: "Beginner"
timeRequired: "The time required to complete the training"
creativeWorkStatus: "The status of the training resource, e.g. 'draft', 'active', 'archived'"
inLanguage: "Language code that the training materials are written in, e.g. 'en'"
learningResourceType: "Format of training rources, e.g. 'workshop', 'slides'"
keywords: "A list of keywords that describe this resource, e.g. 'hardware', 'HPC'"
audience:
  "@type": "Audience"
  audienceType: "A sentence about the target audience of this training"
teaches: "A list of sentences, each describing a main learning outcomes of this training"
license: "The license for sharing / re-using the training resource. E.g. 'https://creativecommons.org/licenses/by/4.0/'"
author: "A list of the types ('Person' or 'Organisation') and names of the author(s).
         If an organisation is provided, this will be considered the 'training resource provider'."
# E.g.
#   -
#     "@type": "Organization"
#     name: "Carpentries Incubator"
#     url: "https://carpentries-incubator.github.io"
contributor: "A list of contributors (individuals or organisations)"
# E.g.   
# -
#     "@type": "Organization"
#     name: "ELIXIR Training Platform"
#     "url": "https://elixir-europe.org/platforms/training"
```

## An Example yaml file
```yml
---
"@context": "https://schema.org"
"@type": "LearningResource"
"@id": "https://www.greenit.fr/frugal-artificial-intelligence-ai-training-course/"
url: "https://www.greenit.fr/frugal-artificial-intelligence-ai-training-course/"
identifier: "https://www.greenit.fr/frugal-artificial-intelligence-ai-training-course/"
"dct:conformsTo":
  "@id": "https://bioschemas.org/profiles/TrainingMaterial/1.0-RELEASE"
  "@type": "CreativeWork"
name: "Frugal Artificial Intelligence (AI) training course"
description: "A one-day training course on frugal artificial intelligence, teaching participants to understand and reduce the environmental and social impacts of AI."
abstract: "Covers the fundamentals of responsible digital practices, key AI impact areas via the three pillars of Green IT (data centers, hardware, software), and current best-practice solutions for lowering AI's footprint, ending with a concrete organizational action plan."
educationalLevel: "Beginner"
timeRequired: "P1D"
creativeWorkStatus: "active"
inLanguage:
  - "en"
learningResourceType:
  - "workshop"
keywords:
  - "frugal AI"
  - "Green IT"
  - "responsible AI"
  - "environmental impact"
  - "data centers"
  - "hardware"
  - "software"
  - "sustainability"
audience:
  "@type": "Audience"
  audienceType: "IT, AI, and ESG professionals; digital responsibility leads; executives dealing with AI-related questions"
teaches:
  - "Understand the basics of the history of artificial intelligence"
  - "Understand the environmental and social impacts of current AI"
  - "Identify impacts by priority according to Green IT principles"
  - "Understand how to assess the frugality of an AI system"
  - "Master solutions to reduce the impact of AI"
  - "Implement a first frugal AI strategy and monitoring tools"
license:
  - "Not stated on the page (Paid, instructor-led; also offered in French)"
author:
  -
    "@type": "Organization"
    name: "Carpentries Incubator"
    url: "https://carpentries-incubator.github.io"
contributor:
  -
    "@type": "Person"
    name: "Joe Bloggs"
```

